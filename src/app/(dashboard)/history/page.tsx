"use client";

import { useState, useEffect, useCallback } from "react";

interface Job {
  id: string;
  url: string;
  contentRequest: string;
  status: string;
  progress: number;
  rowCount?: number | null;
  errorMessage?: string | null;
  outputFormat: string;
  retryCount: number;
  createdAt: string;
  completedAt?: string | null;
  scheduleId?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-600",
};

export default function HistoryPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const PAGE_SIZE = 10;

  const fetchJobs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crawl?page=${p}&pageSize=${PAGE_SIZE}`);
      const data = await res.json();
      if (data.success) {
        setJobs(data.items);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(page);
  }, [page, fetchJobs]);

  async function handleDelete(jobId: string) {
    if (!confirm("Delete this crawl job?")) return;
    await fetch(`/api/crawl/${jobId}`, { method: "DELETE" });
    fetchJobs(page);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Crawl History</h1>
          <p className="text-gray-500 text-sm mt-1">{total} total jobs</p>
        </div>
        <button
          onClick={() => fetchJobs(page)}
          className="text-sm text-primary-600 border border-primary-200 px-3 py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-sm">No crawl history yet.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">URL</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Request</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Rows</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden lg:table-cell">Date</th>
                    <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="max-w-[200px]">
                          <p className="font-medium text-gray-900 truncate" title={job.url}>
                            {job.url}
                          </p>
                          {job.scheduleId && (
                            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              Scheduled
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-gray-600 max-w-[160px] truncate" title={job.contentRequest}>
                          {job.contentRequest}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[job.status] || "bg-gray-100 text-gray-600"}`}>
                          {job.status === "PROCESSING" && (
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1.5 animate-pulse" />
                          )}
                          {job.status.charAt(0) + job.status.slice(1).toLowerCase()}
                          {job.status === "PROCESSING" && ` ${job.progress}%`}
                        </span>
                        {job.errorMessage && (
                          <p className="text-xs text-red-500 mt-0.5 max-w-[150px] truncate" title={job.errorMessage}>
                            {job.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                        {job.rowCount != null ? job.rowCount : "—"}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                        {new Date(job.createdAt).toLocaleDateString()}<br />
                        {new Date(job.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {job.status === "COMPLETED" && (
                            <a
                              href={`/api/crawl/${job.id}/download`}
                              className="text-xs font-medium text-primary-600 hover:text-primary-800 bg-primary-50 px-2.5 py-1 rounded-lg hover:bg-primary-100 transition-colors"
                            >
                              Download {job.outputFormat.toUpperCase()}
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(job.id)}
                            className="text-xs text-gray-400 hover:text-red-600 transition-colors p-1 rounded"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="text-sm px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="text-sm px-3 py-1 border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
