import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, generateVerifyToken } from "@/lib/auth";
import { sendVerificationEmail } from "@/lib/email";
import { isDisposableEmail, isValidEmailFormat } from "@/lib/disposableEmails";
import { addHours } from "date-fns";

const RegisterSchema = z.object({
  name: z.string().min(2).max(60).trim(),
  email: z.string().email().toLowerCase().trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
});

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { success: false, error: "Registration is currently closed." },
    { status: 403 }
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _POST_disabled(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // Block disposable emails
    if (!isValidEmailFormat(email) || isDisposableEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Disposable or temporary email addresses are not allowed. Please use a real email.",
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already registered." },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const verifyToken = generateVerifyToken();
    const verifyTokenExp = addHours(new Date(), 24);

    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verifyToken,
        verifyTokenExp,
      },
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(email, name, verifyToken).catch((err) =>
      console.error("Failed to send verification email:", err)
    );

    return NextResponse.json({
      success: true,
      message:
        "Account created! Please check your email to verify your account.",
      userId: user.id,
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
// REGISTRATION CLOSED — end of disabled handler
