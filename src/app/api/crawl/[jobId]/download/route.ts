import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { exportToCSV, exportToExcel, getMimeType, getFileExtension } from "@/lib/export";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const job = await db.crawlJob.findFirst({
    where: { id: params.jobId, userId: user.id },
  });

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "COMPLETED" || !job.resultData) {
    return NextResponse.json(
      { success: false, error: "Job not completed yet" },
      { status: 400 }
    );
  }

  const resultData = job.resultData as {
    headers: string[];
    rows: string[][];
    summary: string;
  };

  const format = (job.outputFormat || "csv") as "csv" | "xlsx";
  const ext = getFileExtension(format);
  const mimeType = getMimeType(format);

  // Sanitize URL for filename
  let urlHost = "";
  try {
    urlHost = new URL(job.url).hostname.replace(/\./g, "_");
  } catch {
    urlHost = "crawl";
  }

  const filename = `crawdata_${urlHost}_${job.id.slice(0, 8)}.${ext}`;

  let fileBuffer: Buffer;
  if (format === "xlsx") {
    fileBuffer = exportToExcel({
      headers: resultData.headers,
      rows: resultData.rows,
      sheetName: "Crawled Data",
    });
  } else {
    fileBuffer = exportToCSV({
      headers: resultData.headers,
      rows: resultData.rows,
    });
  }

  return new NextResponse(fileBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(fileBuffer.length),
    },
  });
}
