import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { crawlUrl } from "@/lib/crawler";
import { crawlWithBrowser } from "@/lib/crawlerBrowser";
import { extractWithRetry } from "@/lib/gemini";
import { getMaxPages } from "@/lib/planLimits";
import { addHours, addDays, addWeeks } from "date-fns";

const BATCH_MAX_CHARS = 55_000;

function buildBatches(pages: string[]): string[] {
  const batches: string[] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (let i = 0; i < pages.length; i++) {
    const pageText = `--- Page ${i + 1} ---\n${pages[i]}`;
    if (current.length > 0 && currentLen + pageText.length > BATCH_MAX_CHARS) {
      batches.push(current.join("\n"));
      current = [];
      currentLen = 0;
    }
    current.push(pageText);
    currentLen += pageText.length;
  }
  if (current.length > 0) batches.push(current.join("\n"));
  return batches;
}

// This endpoint is called by:
// 1. Vercel Cron (every minute in production) via vercel.json
// 2. The standalone worker script in local dev
// 3. The frontend after submitting a job (to trigger immediate processing)

const WORKER_SECRET = process.env.WORKER_SECRET || "";
const MAX_CONCURRENT_JOBS = 3;

export async function POST(req: NextRequest) {
  // Verify caller (Vercel cron sends Authorization header, standalone worker sends secret)
  const authHeader = req.headers.get("authorization");
  if (WORKER_SECRET && authHeader !== `Bearer ${WORKER_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return runWorkerCycle();
}

// GET is used by Vercel Cron (it sends a GET with x-vercel-cron header)
export async function GET(req: NextRequest) {
  const isVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!isVercelCron && WORKER_SECRET) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${WORKER_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return runWorkerCycle();
}

async function runWorkerCycle(): Promise<NextResponse> {
  const results = { processed: 0, failed: 0, scheduled: 0 };

  try {
    // 1. Process due schedules → create PENDING jobs
    await processDueSchedules();
    results.scheduled++;

    // 2. Pick up PENDING jobs and process them
    const pendingJobs = await db.crawlJob.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: MAX_CONCURRENT_JOBS,
    });

    for (const job of pendingJobs) {
      try {
        await processJob(job.id);
        results.processed++;
      } catch (err) {
        console.error(`Job ${job.id} failed:`, err);
        results.failed++;
      }
    }

    // 3. Retry failed jobs that haven't exceeded maxRetries
    const retryableJobs = await db.crawlJob.findMany({
      where: {
        status: "FAILED",
        retryCount: { lt: 3 },
        // Only retry jobs updated > 5 min ago (avoid rapid loops)
        updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) },
      },
      take: MAX_CONCURRENT_JOBS,
    });

    for (const job of retryableJobs) {
      await db.crawlJob.update({
        where: { id: job.id },
        data: { status: "PENDING" },
      });
    }
  } catch (err) {
    console.error("Worker cycle error:", err);
  }

  return NextResponse.json({ success: true, ...results });
}

async function processJob(jobId: string): Promise<void> {
  // Atomically mark as PROCESSING to prevent duplicate processing
  const updated = await db.crawlJob.updateMany({
    where: { id: jobId, status: "PENDING" },
    data: { status: "PROCESSING", progress: 10, startedAt: new Date() },
  });

  if (updated.count === 0) return; // Another worker grabbed it

  try {
    const job = await db.crawlJob.findUnique({
      where: { id: jobId },
      include: { user: { select: { plan: true } } },
    });
    if (!job) return;

    // Step 1: Crawl the URL (progress 10→20)
    await db.crawlJob.update({ where: { id: jobId }, data: { progress: 20 } });

    let allHeaders: string[] = [];
    let allRows: string[][] = [];
    let summary = "";

    if (job.useBrowser) {
      // Browser mode: paginate then batch-extract
      const maxPages = getMaxPages(job.user.plan);
      const crawlResult = await crawlWithBrowser(job.url, maxPages);

      await db.crawlJob.update({ where: { id: jobId }, data: { progress: 30 } });

      const batches = buildBatches(crawlResult.pages);
      console.log(`[Worker] ${crawlResult.pages.length} pages → ${batches.length} batches`);

      for (let i = 0; i < batches.length; i++) {
        const extracted = await extractWithRetry(
          batches[i],
          job.contentRequest,
          job.url,
          allHeaders.length > 0 ? allHeaders : undefined
        );

        if (allHeaders.length === 0) {
          allHeaders = extracted.headers;
          summary = extracted.summary;
        }
        allRows.push(...extracted.rows);

        // Progress: 30 → 95 across batches
        const batchProgress = 30 + Math.floor(((i + 1) / batches.length) * 65);
        await db.crawlJob.update({ where: { id: jobId }, data: { progress: batchProgress } });
        console.log(`[Worker] Batch ${i + 1}/${batches.length}: ${extracted.rows.length} rows (total: ${allRows.length})`);
      }
    } else {
      // Static mode: try axios first, auto-fallback to browser on 403/429
      let staticContent: string;
      try {
        const crawlResult = await crawlUrl(job.url);
        staticContent = crawlResult.content;
      } catch (staticErr) {
        const msg = staticErr instanceof Error ? staticErr.message : String(staticErr);
        const isBlocked = /HTTP (403|429)/.test(msg);
        if (!isBlocked) throw staticErr;

        console.log(`[Worker] Static crawl blocked (${msg}), retrying with browser…`);
        const maxPages = getMaxPages(job.user.plan);
        const browserResult = await crawlWithBrowser(job.url, maxPages);

        await db.crawlJob.update({ where: { id: jobId }, data: { progress: 30 } });

        const batches = buildBatches(browserResult.pages);
        for (let i = 0; i < batches.length; i++) {
          const extracted = await extractWithRetry(
            batches[i],
            job.contentRequest,
            job.url,
            allHeaders.length > 0 ? allHeaders : undefined
          );
          if (allHeaders.length === 0) {
            allHeaders = extracted.headers;
            summary = extracted.summary;
          }
          allRows.push(...extracted.rows);
          const batchProgress = 30 + Math.floor(((i + 1) / batches.length) * 65);
          await db.crawlJob.update({ where: { id: jobId }, data: { progress: batchProgress } });
        }
        // Skip the single-page Gemini call below
        staticContent = "";
      }

      if (staticContent) {
        await db.crawlJob.update({ where: { id: jobId }, data: { progress: 50 } });
        const extracted = await extractWithRetry(staticContent, job.contentRequest, job.url);
        await db.crawlJob.update({ where: { id: jobId }, data: { progress: 90 } });
        allHeaders = extracted.headers;
        allRows = extracted.rows;
        summary = extracted.summary;
      }
    }

    // Step 3: Save result
    await db.crawlJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        progress: 100,
        resultData: {
          headers: allHeaders,
          rows: allRows,
          summary,
        },
        rowCount: allRows.length,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    const job = await db.crawlJob.findUnique({ where: { id: jobId } });
    const retryCount = (job?.retryCount ?? 0) + 1;

    await db.crawlJob.update({
      where: { id: jobId },
      data: {
        status: retryCount >= 3 ? "FAILED" : "PENDING",
        progress: 0,
        errorMessage,
        retryCount,
      },
    });

    if (retryCount >= 3) throw err;
  }
}

async function processDueSchedules(): Promise<void> {
  const now = new Date();

  const dueSchedules = await db.schedule.findMany({
    where: {
      isActive: true,
      nextRun: { lte: now },
    },
  });

  for (const schedule of dueSchedules) {
    // Create a new job for this schedule
    await db.crawlJob.create({
      data: {
        userId: schedule.userId,
        url: schedule.url,
        contentRequest: schedule.contentRequest,
        outputFormat: schedule.outputFormat,
        status: "PENDING",
        scheduleId: schedule.id,
      },
    });

    // Calculate next run time
    let nextRun: Date;
    switch (schedule.interval) {
      case "hourly":
        nextRun = addHours(now, 1);
        break;
      case "daily":
        nextRun = addDays(now, 1);
        break;
      case "weekly":
        nextRun = addWeeks(now, 1);
        break;
      default:
        nextRun = addDays(now, 1);
    }

    await db.schedule.update({
      where: { id: schedule.id },
      data: { lastRun: now, nextRun },
    });
  }
}
