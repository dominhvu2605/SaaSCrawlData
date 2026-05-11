import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Page } from "puppeteer";
import type { CrawlResult } from "./crawler";

puppeteer.use(StealthPlugin());

export interface BrowserCrawlResult extends CrawlResult {
  pages: string[]; // per-page content for batched Gemini extraction
}

const PAGE_SETTLE_MS = 1500;

// Resource types to block during pagination — not needed for text extraction
const BLOCKED_TYPES = new Set(["image", "media", "font"]);

export async function crawlWithBrowser(url: string, maxPages: number): Promise<BrowserCrawlResult> {
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--disable-default-apps",
    "--ignore-certificate-errors",
    "--allow-running-insecure-content",
    "--disable-features=SafeBrowsing,SafeBrowsingEnhancedProtection,BlockInsecurePrivateNetworkRequests,HttpsUpgrades",
    "--no-first-run",
  ];

  // Chrome's HTTPS-First mode (active in headless/Incognito) auto-upgrades http:// → https://
  // and shows an unclickable interstitial when the server has no HTTPS.
  // This flag marks the specific origin as trusted so Chrome skips the interstitial.
  if (url.startsWith("http://")) {
    try {
      args.push(`--unsafely-treat-insecure-origin-as-secure=${new URL(url).origin}`);
    } catch { /* ignore malformed URL */ }
  }

  const browser = await puppeteer.launch({ headless: true, args });

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 900 });

    // Navigate WITHOUT request interception so the main document loads cleanly.
    // Interception before goto can trigger ERR_BLOCKED_BY_CLIENT on HTTP sites
    // because Chrome's HTTPS-upgrade / navigation throttles interact with CDP
    // request pausing and may cancel the navigation.
    const gotoOpts = { waitUntil: "domcontentloaded" as const, timeout: 60000 };

    const gotoTarget = async (targetUrl: string) => {
      try {
        await page.goto(targetUrl, gotoOpts);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        // On timeout, proceed if DOM has usable content
        if (msg.includes("timeout")) {
          const html = await page.content().catch(() => "");
          if (html.length >= 500 && !page.url().startsWith("chrome-error://")) return;
        }
        throw err;
      }
    };

    // Visit root first to let server set session cookies (fixes ASP.NET redirect loops)
    try {
      const origin = new URL(url).origin;
      await page.goto(origin, { waitUntil: "domcontentloaded", timeout: 20000 });
      await new Promise((r) => setTimeout(r, 800));
    } catch { /* ignore — best-effort */ }

    await gotoTarget(url);

    // Enable interception AFTER the initial load — only affects sub-resource
    // requests triggered by pagination clicks, never the main navigation.
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (BLOCKED_TYPES.has(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Extra wait for JS-rendered tables to appear after domcontentloaded
    await new Promise((r) => setTimeout(r, 1000));

    const title = await page.title();
    const seenHashes = new Set<string>();
    const pageContents: string[] = [];
    const pages: string[] = [];

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const text = await extractVisibleText(page);
      const hash = roughHash(text.slice(0, 3000));

      if (seenHashes.has(hash)) break; // Same content = last page or loop
      seenHashes.add(hash);

      pages.push(text);
      pageContents.push(
        pageNum === 1 ? text : `\n--- Page ${pageNum} ---\n${text}`
      );

      const moved = await clickNextPage(page);
      if (!moved) break;

      await new Promise((r) => setTimeout(r, PAGE_SETTLE_MS));
    }

    const content = pageContents.join("\n");
    console.log(`[Crawler] "${title}" — ${pages.length} pages, ${content.length} chars captured`);
    console.log(`[Crawler] Preview:\n${content.slice(0, 500)}`);

    return {
      content,
      pages,
      title,
      statusCode: 200,
      contentType: "text/html",
    };
  } finally {
    await browser.close();
  }
}

// ─── Extract visible text ─────────────────────────────────────────────────────

async function extractVisibleText(page: Page): Promise<string> {
  return page.evaluate(() => {
    document
      .querySelectorAll("script, style, noscript, iframe")
      .forEach((el) => el.remove());

    // Pick the table with the most text — avoids picking navigation/layout tables
    const tables = Array.from(document.querySelectorAll("table")) as HTMLElement[];
    if (tables.length > 0) {
      const largest = tables.reduce((best, t) =>
        t.innerText.trim().length > best.innerText.trim().length ? t : best
      );
      if (largest.innerText.trim().length > 100) {
        return largest.innerText.replace(/\n{3,}/g, "\n\n").trim();
      }
    }

    // Fall back to common content containers (ASP.NET ContentPlaceHolder included)
    const candidates = [
      "main", "article", '[role="main"]',
      "#main-content", "#content", ".content",
      '[id*="ContentPlaceHolder"]', '[id*="content"]',
    ];
    for (const sel of candidates) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el && el.innerText.trim().length > 100) {
        return el.innerText.replace(/\n{3,}/g, "\n\n").trim();
      }
    }
    return (document.body as HTMLElement).innerText
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  });
}

// ─── Click next page ──────────────────────────────────────────────────────────

async function clickNextPage(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // Strategy 1: Numbered pagination — ASP.NET GridView pattern
    // Current page = <span>N</span>, other pages = <a>N</a>
    const numericEls = (
      Array.from(document.querySelectorAll("a, span, b")) as HTMLElement[]
    ).filter((el) => /^\d+$/.test(el.innerText?.trim() || ""));

    if (numericEls.length >= 2) {
      let currentIdx = -1;
      for (let i = 0; i < numericEls.length; i++) {
        const el = numericEls[i];
        const isCurrent =
          el.tagName === "SPAN" ||
          el.tagName === "B" ||
          el.classList.contains("active") ||
          el.classList.contains("current") ||
          el.getAttribute("aria-current") === "page";
        if (isCurrent) currentIdx = i;
      }

      if (currentIdx >= 0) {
        for (let i = currentIdx + 1; i < numericEls.length; i++) {
          const next = numericEls[i];
          if (next.tagName === "A" && !next.classList.contains("disabled")) {
            next.click();
            return true;
          }
        }
        return false; // No more pages
      }
    }

    // Strategy 2: Text-based "Next" buttons
    const nextTexts = ["next", ">", "»", "→", "next page", "tiếp"];
    for (const el of Array.from(
      document.querySelectorAll("a, button, input[type='button'], input[type='submit']")
    ) as HTMLElement[]) {
      const text = (el.innerText || (el as HTMLInputElement).value || "")
        .trim().toLowerCase();
      if (nextTexts.includes(text)) {
        const disabled =
          el.classList.contains("disabled") ||
          (el as HTMLInputElement).disabled ||
          el.getAttribute("aria-disabled") === "true";
        if (!disabled) { el.click(); return true; }
      }
    }

    // Strategy 3: aria-label
    const ariaNext = document.querySelector(
      '[aria-label="Next"], [aria-label="Next page"], [aria-label="next"]'
    ) as HTMLElement | null;
    if (ariaNext && ariaNext.getAttribute("aria-disabled") !== "true") {
      ariaNext.click();
      return true;
    }

    // Strategy 4: CSS class patterns
    const classNext = document.querySelector(
      ".next:not(.disabled) a, .page-next:not(.disabled), li.next:not(.disabled) a"
    ) as HTMLElement | null;
    if (classNext) { classNext.click(); return true; }

    return false;
  });
}

function roughHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i);
    h |= 0;
  }
  return h.toString(36);
}
