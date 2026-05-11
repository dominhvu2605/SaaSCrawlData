"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type JobStatus = "idle" | "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

interface JobState {
  id: string;
  status: JobStatus;
  progress: number;
  rowCount?: number | null;
  errorMessage?: string | null;
}

export default function CrawlPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    url: "",
    contentRequest: "",
    outputFormat: "csv" as "csv" | "xlsx",
    useBrowser: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<JobState | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  function startPolling(jobId: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/crawl/${jobId}`);
        const data = await res.json();
        if (!data.success) return;

        const j = data.job;
        setJob({
          id: j.id,
          status: j.status,
          progress: j.progress,
          rowCount: j.rowCount,
          errorMessage: j.errorMessage,
        });

        if (j.status === "COMPLETED" || j.status === "FAILED" || j.status === "CANCELLED") {
          stopPolling();
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setJob(null);
    setLoading(true);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to start crawl");
        return;
      }

      const jobId: string = data.jobId;
      setJob({ id: jobId, status: "PENDING", progress: 0 });
      startPolling(jobId);

      // Trigger worker to start immediately
      fetch("/api/worker", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.NEXT_PUBLIC_WORKER_SECRET || ""}` },
      }).catch(() => {});
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (job?.id) {
      window.location.href = `/api/crawl/${job.id}/download`;
    }
  }

  function handleNewCrawl() {
    stopPolling();
    setJob(null);
    setError("");
    setForm({ url: "", contentRequest: "", outputFormat: "csv", useBrowser: false });
  }

  const isProcessing = job?.status === "PENDING" || job?.status === "PROCESSING";
  const isCompleted = job?.status === "COMPLETED";
  const isFailed = job?.status === "FAILED";

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Crawl</h1>
        <p className="text-gray-500 text-sm mt-1">
          Enter a URL and describe what data you want to extract.
        </p>
      </div>

      {/* Form */}
      {!job && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Website URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com/products"
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                What to extract <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.contentRequest}
                onChange={(e) => setForm({ ...form, contentRequest: e.target.value })}
                placeholder="e.g., Extract all product names, prices, and descriptions. Include availability status."
                required
                rows={4}
                minLength={5}
                maxLength={500}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{form.contentRequest.length}/500</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Export format
              </label>
              <div className="flex gap-3">
                {(["csv", "xlsx"] as const).map((fmt) => (
                  <label
                    key={fmt}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors text-sm font-medium ${
                      form.outputFormat === fmt
                        ? "border-primary-500 bg-primary-50 text-primary-700"
                        : "border-gray-300 text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="radio"
                      value={fmt}
                      checked={form.outputFormat === fmt}
                      onChange={() => setForm({ ...form, outputFormat: fmt })}
                      className="sr-only"
                    />
                    {fmt.toUpperCase()}
                    <span className="text-xs font-normal opacity-70">
                      {fmt === "csv" ? "(smaller)" : "(Excel)"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Browser / Pagination toggle */}
            <div
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                form.useBrowser
                  ? "border-amber-400 bg-amber-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setForm({ ...form, useBrowser: !form.useBrowser })}
            >
              <div className={`w-10 h-6 rounded-full flex-shrink-0 relative transition-colors mt-0.5 ${form.useBrowser ? "bg-amber-500" : "bg-gray-300"}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.useBrowser ? "translate-x-5" : "translate-x-1"}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">
                  Enable browser mode (JS + pagination)
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Use a headless browser to handle JavaScript-rendered pages and automatically
                  crawl through all pagination pages (e.g. ASP.NET, DataTables). Slower but
                  handles dynamic content.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white font-semibold py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
            >
              {loading ? "Queuing..." : "Start Crawl"}
            </button>
          </form>
        </div>
      )}

      {/* Progress */}
      {job && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                {isProcessing
                  ? getProgressLabel(job.progress)
                  : isCompleted
                  ? "Extraction complete!"
                  : isFailed
                  ? "Crawl failed"
                  : "Cancelled"}
              </span>
              <span className="text-sm text-gray-500">{job.progress}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCompleted
                    ? "bg-green-500"
                    : isFailed
                    ? "bg-red-400"
                    : "bg-primary-500 animate-pulse"
                }`}
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>

          {isProcessing && (
            <div className="text-center text-gray-500 py-4">
              <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-3" />
              <p className="text-sm">Processing in background. You can close this tab — the crawl will continue.</p>
            </div>
          )}

          {isCompleted && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {job.rowCount != null && (
                <p className="text-gray-600 text-sm mb-4">
                  Extracted <strong>{job.rowCount}</strong> rows of data.
                </p>
              )}
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleDownload}
                  className="bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-700 transition-colors text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download {form.outputFormat.toUpperCase()}
                </button>
                <button
                  onClick={handleNewCrawl}
                  className="border border-gray-300 text-gray-700 font-semibold px-6 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  New Crawl
                </button>
              </div>
            </div>
          )}

          {isFailed && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              {job.errorMessage && (
                <p className="text-sm text-red-600 mb-4 bg-red-50 rounded-lg p-3">
                  {job.errorMessage}
                </p>
              )}
              <button
                onClick={handleNewCrawl}
                className="bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-700 transition-colors text-sm"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getProgressLabel(progress: number): string {
  if (progress < 20) return "Queued...";
  if (progress < 50) return "Crawling website...";
  if (progress < 90) return "Extracting data with AI...";
  return "Saving results...";
}
