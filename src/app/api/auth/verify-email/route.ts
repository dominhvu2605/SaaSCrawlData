import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(
      new URL("/login?error=invalid-token", req.url)
    );
  }

  const user = await db.user.findUnique({ where: { verifyToken: token } });

  if (!user || !user.verifyTokenExp || user.verifyTokenExp < new Date()) {
    return NextResponse.redirect(
      new URL("/login?error=token-expired", req.url)
    );
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verifyToken: null,
      verifyTokenExp: null,
    },
  });

  return NextResponse.redirect(
    new URL("/login?verified=true", req.url)
  );
}
