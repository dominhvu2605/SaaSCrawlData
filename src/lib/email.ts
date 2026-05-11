import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "CrawData";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM = process.env.EMAIL_FROM || `${APP_NAME} <noreply@crawdata.app>`;

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Verify your ${APP_NAME} account</h2>
      <p>Hi ${name},</p>
      <p>Thanks for signing up! Please verify your email address by clicking the button below:</p>
      <a href="${verifyUrl}"
         style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0;">
        Verify Email
      </a>
      <p style="color:#666;font-size:13px;">
        Or copy this link: <a href="${verifyUrl}">${verifyUrl}</a>
      </p>
      <p style="color:#666;font-size:13px;">
        This link expires in 24 hours. If you didn't create an account, ignore this email.
      </p>
    </div>
  `;

  if (
    !process.env.SMTP_USER ||
    process.env.SMTP_USER === "your-email@gmail.com"
  ) {
    // Dev fallback: log to console
    console.log(`\n[DEV] Verification email for ${to}:\n${verifyUrl}\n`);
    return;
  }

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Verify your ${APP_NAME} account`,
    html,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string
): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Reset your ${APP_NAME} password</h2>
      <p>Hi ${name},</p>
      <p>You requested a password reset. Click below to set a new password:</p>
      <a href="${resetUrl}"
         style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;margin:16px 0;">
        Reset Password
      </a>
      <p style="color:#666;font-size:13px;">
        This link expires in 1 hour. If you didn't request this, ignore this email.
      </p>
    </div>
  `;

  if (!process.env.SMTP_USER || process.env.SMTP_USER === "your-email@gmail.com") {
    console.log(`\n[DEV] Password reset email for ${to}:\n${resetUrl}\n`);
    return;
  }

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Reset your ${APP_NAME} password`,
    html,
  });
}
