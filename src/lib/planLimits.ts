import { Plan } from "@prisma/client";
import { db } from "./db";
import { startOfDay, endOfDay } from "date-fns";

const DEFAULT_MAX_PAGES = 1000; // safety cap for PRO (null → this value)

export interface PlanConfig {
  name: string;
  dailyLimit: number | null;   // null = unlimited
  canSchedule: boolean;
  trialLimit: number | null;   // total lifetime limit for TRIAL
  maxPages: number | null;     // null = unlimited (PRO)
}

export const PLAN_CONFIG: Record<Plan, PlanConfig> = {
  TRIAL: {
    name: "Trial",
    dailyLimit: null,
    trialLimit: 1,
    canSchedule: false,
    maxPages: 10,
  },
  BASIC: {
    name: "Basic",
    dailyLimit: 1,
    trialLimit: null,
    canSchedule: false,
    maxPages: 50,
  },
  PLUS: {
    name: "Plus",
    dailyLimit: 10,
    trialLimit: null,
    canSchedule: true,
    maxPages: 100,
  },
  PRO: {
    name: "Pro",
    dailyLimit: null,
    trialLimit: null,
    canSchedule: true,
    maxPages: null,
  },
};

export function getMaxPages(plan: Plan): number {
  return PLAN_CONFIG[plan].maxPages ?? DEFAULT_MAX_PAGES;
}

export async function checkCrawlLimit(
  userId: string,
  plan: Plan,
  trialUsed: boolean
): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  const config = PLAN_CONFIG[plan];

  // Trial plan: only 1 URL total
  if (plan === "TRIAL") {
    if (trialUsed) {
      return {
        allowed: false,
        reason:
          "Trial limit reached. Please upgrade to a paid plan to continue crawling.",
      };
    }
    return { allowed: true, remaining: 1 };
  }

  // Unlimited plan
  if (config.dailyLimit === null) {
    return { allowed: true };
  }

  // Count jobs created today
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const todayCount = await db.crawlJob.count({
    where: {
      userId,
      createdAt: { gte: todayStart, lte: todayEnd },
      scheduleId: null, // Don't count scheduled jobs against manual quota
    },
  });

  if (todayCount >= config.dailyLimit) {
    return {
      allowed: false,
      reason: `Daily limit of ${config.dailyLimit} crawl${config.dailyLimit > 1 ? "s" : ""} reached. Resets at midnight.`,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    remaining: config.dailyLimit - todayCount,
  };
}

export function canUseSchedule(plan: Plan): boolean {
  return PLAN_CONFIG[plan].canSchedule;
}
