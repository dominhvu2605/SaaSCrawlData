"use client";

import { useState, useEffect, useCallback } from "react";

interface Schedule {
  id: string;
  name: string;
  url: string;
  contentRequest: string;
  interval: string;
  outputFormat: string;
  isActive: boolean;
  lastRun?: string | null;
  nextRun?: string | null;
  createdAt: string;
  _count: { jobs: number };
}

const INTERVALS = [
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Every day" },
  { value: "weekly", label: "Every week" },
];

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    url: "",
    contentRequest: "",
    interval: "daily" as "hourly" | "daily" | "weekly",
    outputFormat: "csv" as "csv" | "xlsx",
  });

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/schedule");
      const data = await res.json();
      if (data.success) setSchedules(data.schedules);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Failed to create schedule");
        return;
      }

      setShowForm(false);
      setForm({ name: "", url: "", contentRequest: "", interval: "daily", outputFormat: "csv" });
      fetchSchedules();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleSchedule(id: string, isActive: boolean) {
    await fetch(`/api/schedule/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchSchedules();
  }

  async function deleteSchedule(id: string) {
    if (!confirm("Delete this schedule? All associated jobs will be removed.")) return;
    await fetch(`/api/schedule/${id}`, { method: "DELETE" });
    fetchSchedules();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Crawls</h1>
          <p className="text-gray-500 text-sm mt-1">Automate recurring data extraction</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          {showForm ? "Cancel" : "+ New Schedule"}
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Create New Schedule</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Daily product prices"
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interval</label>
                <select
                  value={form.interval}
                  onChange={(e) => setForm({ ...form, interval: e.target.value as typeof form.interval })}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {INTERVALS.map((i) => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://example.com"
                required
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">What to extract</label>
              <textarea
                value={form.contentRequest}
                onChange={(e) => setForm({ ...form, contentRequest: e.target.value })}
                placeholder="Extract all product names and prices"
                required
                rows={3}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <div className="flex gap-2">
                  {(["csv", "xlsx"] as const).map((fmt) => (
                    <label key={fmt} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer text-sm ${form.outputFormat === fmt ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-300 text-gray-600"}`}>
                      <input type="radio" value={fmt} checked={form.outputFormat === fmt} onChange={() => setForm({ ...form, outputFormat: fmt })} className="sr-only" />
                      {fmt.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex-1" />
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60 text-sm mt-4"
              >
                {submitting ? "Creating..." : "Create Schedule"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule List */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          Loading...
        </div>
      ) : schedules.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium mb-1">No schedules yet</p>
          <p className="text-gray-500 text-sm">Create a schedule to automatically crawl data on a recurring basis.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{schedule.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${schedule.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {schedule.isActive ? "Active" : "Paused"}
                    </span>
                    <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                      {INTERVALS.find((i) => i.value === schedule.interval)?.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">{schedule.url}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{schedule.contentRequest}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    <span>{schedule._count.jobs} runs</span>
                    {schedule.lastRun && <span>Last: {new Date(schedule.lastRun).toLocaleString()}</span>}
                    {schedule.nextRun && schedule.isActive && (
                      <span>Next: {new Date(schedule.nextRun).toLocaleString()}</span>
                    )}
                    <span className="uppercase font-medium text-gray-500">{schedule.outputFormat}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleSchedule(schedule.id, schedule.isActive)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                      schedule.isActive
                        ? "border-gray-300 text-gray-600 hover:bg-gray-50"
                        : "border-green-300 text-green-600 hover:bg-green-50"
                    }`}
                  >
                    {schedule.isActive ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => deleteSchedule(schedule.id)}
                    className="text-xs text-gray-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
