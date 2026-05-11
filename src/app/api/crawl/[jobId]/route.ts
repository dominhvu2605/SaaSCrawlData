import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

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
    select: {
      id: true,
      url: true,
      contentRequest: true,
      status: true,
      progress: true,
      rowCount: true,
      errorMessage: true,
      retryCount: true,
      outputFormat: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
      scheduleId: true,
    },
  });

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, job });
}

export async function DELETE(
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

  // Can only cancel PENDING or PROCESSING jobs
  if (job.status === "PENDING" || job.status === "PROCESSING") {
    await db.crawlJob.update({
      where: { id: job.id },
      data: { status: "CANCELLED" },
    });
  } else {
    await db.crawlJob.delete({ where: { id: job.id } });
  }

  return NextResponse.json({ success: true });
}
