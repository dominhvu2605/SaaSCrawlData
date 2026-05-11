export type Plan = "TRIAL" | "BASIC" | "PLUS" | "PRO";
export type JobStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface User {
  id: string;
  email: string;
  name: string;
  plan: Plan;
  emailVerified: boolean;
  trialUsed: boolean;
  createdAt: string;
}

export interface CrawlJob {
  id: string;
  userId: string;
  url: string;
  contentRequest: string;
  status: JobStatus;
  progress: number;
  resultFile?: string | null;
  rowCount?: number | null;
  errorMessage?: string | null;
  retryCount: number;
  outputFormat: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  scheduleId?: string | null;
}

export interface Schedule {
  id: string;
  userId: string;
  name: string;
  url: string;
  contentRequest: string;
  interval: "hourly" | "daily" | "weekly";
  outputFormat: string;
  isActive: boolean;
  lastRun?: string | null;
  nextRun?: string | null;
  createdAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
