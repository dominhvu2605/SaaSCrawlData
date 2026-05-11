/**
 * CLI script to manually create user accounts.
 *
 * Usage:
 *   npm run create-user -- --name "John Doe" --email john@example.com --password secret123 --plan PRO
 *
 * Options:
 *   --name      Full name (required)
 *   --email     Email address (required)
 *   --password  Password, min 8 chars (required)
 *   --plan      TRIAL | BASIC | PLUS | PRO  (default: PLUS)
 *   --verified  Skip email verification (default: true)
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      result[args[i].slice(2)] = args[i + 1] ?? "true";
      i++;
    }
  }
  return result;
}

async function main() {
  const args = parseArgs();

  const name = args.name?.trim();
  const email = args.email?.trim().toLowerCase();
  const password = args.password;
  const plan = (args.plan?.toUpperCase() || "PLUS") as "TRIAL" | "BASIC" | "PLUS" | "PRO";
  const verified = args.verified !== "false";

  if (!name || !email || !password) {
    console.error("Usage: npm run create-user -- --name <name> --email <email> --password <password> [--plan PRO] [--verified false]");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const validPlans = ["TRIAL", "BASIC", "PLUS", "PRO"];
  if (!validPlans.includes(plan)) {
    console.error(`Invalid plan: ${plan}. Must be one of: ${validPlans.join(", ")}`);
    process.exit(1);
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`User with email "${email}" already exists.`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      plan,
      emailVerified: verified,
    },
  });

  console.log(`\nUser created successfully:`);
  console.log(`  ID:       ${user.id}`);
  console.log(`  Name:     ${user.name}`);
  console.log(`  Email:    ${user.email}`);
  console.log(`  Plan:     ${user.plan}`);
  console.log(`  Verified: ${user.emailVerified}`);
  console.log();
}

main()
  .catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
