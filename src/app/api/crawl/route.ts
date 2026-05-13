import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkCrawlLimit } from "@/lib/planLimits";

const CrawlSchema = z.object({
  url: z.string().url("Please provide a valid URL"),
  contentRequest: z
    .string()
    .min(5, "Please describe what data you want to extract")
    .max(500),
  outputFormat: z.enum(["csv", "xlsx"]).default("csv"),
  useBrowser: z.boolean().default(false),
  followLinks: z.boolean().default(false),
});

// Simple in-memory rate limiter (per IP, resets on server restart)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = parseInt(process.env.CRAWL_RATE_LIMIT || "10");

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export async function POST(req: NextRequest) {
  // Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json(
      { success: false, error: "Please verify your email first" },
      { status: 403 }
    );
  }

  // IP rate limit
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { success: false, error: "Too many requests. Please wait a minute." },
      { status: 429 }
    );
  }

  // Parse body
  const body = await req.json().catch(() => ({}));
  const parsed = CrawlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { url, contentRequest, outputFormat, useBrowser, followLinks } = parsed.data;

  // Plan limit check (get fresh user data for trial check)
  const freshUser = await db.user.findUnique({ where: { id: user.id } });
  if (!freshUser) {
    return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
  }

  const limitCheck = await checkCrawlLimit(freshUser.id, freshUser.plan, freshUser.trialUsed);
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { success: false, error: limitCheck.reason },
      { status: 403 }
    );
  }

  // Create job
  const job = await db.crawlJob.create({
    data: {
      userId: user.id,
      url,
      contentRequest,
      outputFormat,
      useBrowser: useBrowser || followLinks,
      followLinks,
      status: "PENDING",
    },
  });

  // Mark trial as used
  if (freshUser.plan === "TRIAL") {
    await db.user.update({
      where: { id: freshUser.id },
      data: { trialUsed: true },
    });
  }

  return NextResponse.json({
    success: true,
    jobId: job.id,
    message: "Crawl job queued successfully",
  });
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
  const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") || "10");
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    db.crawlJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        url: true,
        contentRequest: true,
        status: true,
        progress: true,
        rowCount: true,
        errorMessage: true,
        outputFormat: true,
        retryCount: true,
        createdAt: true,
        completedAt: true,
        scheduleId: true,
      },
    }),
    db.crawlJob.count({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    success: true,
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
