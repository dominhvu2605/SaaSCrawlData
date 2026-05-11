import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLAN_CONFIG } from "@/lib/planLimits";
import Link from "next/link";
import { startOfDay, endOfDay } from "date-fns";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const today = new Date();
  const [totalJobs, todayJobs, completedJobs, failedJobs, recentJobs] =
    await Promise.all([
      db.crawlJob.count({ where: { userId: user.id } }),
      db.crawlJob.count({
        where: {
          userId: user.id,
          createdAt: { gte: startOfDay(today), lte: endOfDay(today) },
        },
      }),
      db.crawlJob.count({ where: { userId: user.id, status: "COMPLETED" } }),
      db.crawlJob.count({ where: { userId: user.id, status: "FAILED" } }),
      db.crawlJob.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          url: true,
          status: true,
          rowCount: true,
          createdAt: true,
          outputFormat: true,
        },
      }),
    ]);

  const planConfig = PLAN_CONFIG[user.plan];
  const dailyLimit = planConfig.dailyLimit;
  const remaining =
    dailyLimit !== null ? Math.max(0, dailyLimit - todayJobs) : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Welcome back, {user.name}
        </p>
      </div>

      {/* Plan Banner */}
      <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary-600">
            {planConfig.name} Plan
          </span>
          <p className="text-sm text-gray-700 mt-0.5">
            {user.plan === "TRIAL" ? (
              user.trialUsed ? (
                <span className="text-orange-600 font-medium">Trial used — upgrade to continue crawling</span>
              ) : (
                "You have 1 free trial crawl remaining"
              )
            ) : dailyLimit !== null ? (
              `${remaining} of ${dailyLimit} crawl${dailyLimit > 1 ? "s" : ""} remaining today`
            ) : (
              "Unlimited crawls"
            )}
          </p>
        </div>
        {(user.plan === "TRIAL" || user.plan === "BASIC") && (
          <Link
            href="/#pricing"
            className="text-sm font-semibold text-primary-600 bg-white border border-primary-200 px-4 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Upgrade plan
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Crawls", value: totalJobs, color: "text-primary-600" },
          { label: "Today", value: todayJobs, color: "text-blue-600" },
          { label: "Completed", value: completedJobs, color: "text-green-600" },
          { label: "Failed", value: failedJobs, color: "text-red-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Recent Crawls</h2>
              <Link href="/history" className="text-sm text-primary-600 hover:underline">
                View all
              </Link>
            </div>
            {recentJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No crawls yet.</p>
                <Link href="/crawl" className="mt-2 inline-block text-sm text-primary-600 hover:underline">
                  Start your first crawl
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentJobs.map((job) => (
                  <div key={job.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{job.url}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(job.createdAt).toLocaleString()}
                        {job.rowCount != null && ` · ${job.rowCount} rows`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={job.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col">
          <h2 className="font-semibold text-gray-900 mb-4">Quick start</h2>
          <div className="space-y-3 flex-1">
            <Link
              href="/crawl"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors group"
            >
              <div className="w-9 h-9 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">New Crawl</p>
                <p className="text-xs text-gray-500">Extract data from a URL</p>
              </div>
            </Link>
            {planConfig.canSchedule && (
              <Link
                href="/schedule"
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors group"
              >
                <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">New Schedule</p>
                  <p className="text-xs text-gray-500">Automate recurring crawls</p>
                </div>
              </Link>
            )}
            <Link
              href="/history"
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors group"
            >
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">View History</p>
                <p className="text-xs text-gray-500">Download past results</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    PROCESSING: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-100 text-gray-600"}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
