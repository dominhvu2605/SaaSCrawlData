/**
 * Standalone background worker for CrawData.
 *
 * Runs independently of the Next.js server.
 * Processes pending crawl jobs and scheduled tasks even when the browser is closed.
 *
 * Usage:
 *   npm run worker          (tsx, development)
 *   npm run worker:prod     (compiled JS, production)
 *
 * The worker calls the /api/worker endpoint on the running Next.js server.
 */

import "dotenv/config";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const WORKER_SECRET = process.env.WORKER_SECRET || "";
const INTERVAL_MS = parseInt(process.env.WORKER_INTERVAL_MS || "30000");

let running = false;

async function tick() {
  if (running) return; // Skip if previous tick is still going
  running = true;

  try {
    const res = await fetch(`${APP_URL}/api/worker`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(WORKER_SECRET ? { Authorization: `Bearer ${WORKER_SECRET}` } : {}),
      },
    });

    if (res.ok) {
      const data = await res.json();
      const { processed, failed, scheduled } = data;
      if (processed > 0 || failed > 0) {
        console.log(
          `[${new Date().toISOString()}] Worker: processed=${processed}, failed=${failed}, scheduled=${scheduled}`
        );
      }
    } else {
      console.error(`[Worker] HTTP ${res.status}: ${await res.text()}`);
    }
  } catch (err) {
    console.error(`[Worker] Error:`, err instanceof Error ? err.message : err);
  } finally {
    running = false;
  }
}

console.log(`[Worker] Starting — polling every ${INTERVAL_MS / 1000}s → ${APP_URL}`);

// Run immediately on start, then on interval
tick();
setInterval(tick, INTERVAL_MS);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("[Worker] Shutting down...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("[Worker] Shutting down...");
  process.exit(0);
});
