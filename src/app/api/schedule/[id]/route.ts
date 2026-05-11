import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const schedule = await db.schedule.findFirst({
    where: { id: params.id, userId: user.id },
  });

  if (!schedule) {
    return NextResponse.json({ success: false, error: "Schedule not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  await db.schedule.update({
    where: { id: params.id },
    data: {
      isActive:
        body.isActive !== undefined ? body.isActive : schedule.isActive,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
  }

  const schedule = await db.schedule.findFirst({
    where: { id: params.id, userId: user.id },
  });

  if (!schedule) {
    return NextResponse.json({ success: false, error: "Schedule not found" }, { status: 404 });
  }

  await db.schedule.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
