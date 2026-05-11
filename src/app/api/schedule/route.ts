import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { canUseSchedule } from "@/lib/planLimits";
import { addHours, addDays, addWeeks } from "date-fns";

const ScheduleSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  url: z.string().url(),
  contentRequest: z.string().min(5).max(500).trim(),
  interval: z.enum(["hourly", "daily", "weekly"]),
  outputFormat: z.enum(["csv", "xlsx"]).default("csv"),
});

function getNextRun(interval: "hourly" | "daily" | "weekly"): Date {
  const now = new Date();
  switch (interval) {
    case "hourly":
      return addHours(now, 1);
    case "daily":
      return addDays(now, 1);
    case "weekly":
      return addWeeks(now, 1);
  }
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  if (!canUseSchedule(user.plan)) {
    return NextResponse.json(
      {
        success: false,
        error: "Schedule crawl requires Plus or Pro plan. Please upgrade.",
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.errors[0].message },
      { status: 400 }
    );
  }

  const { name, url, contentRequest, interval, outputFormat } = parsed.data;

  const schedule = await db.schedule.create({
    data: {
      userId: user.id,
      name,
      url,
      contentRequest,
      interval,
      outputFormat,
      nextRun: getNextRun(interval),
    },
  });

  return NextResponse.json({ success: true, schedule });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const schedules = await db.schedule.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { jobs: true } },
    },
  });

  return NextResponse.json({ success: true, schedules });
}
