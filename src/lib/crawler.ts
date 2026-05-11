import axios from "axios";
import * as cheerio from "cheerio";

export interface CrawlResult {
  content: string;
  title: string;
  statusCode: number;
  contentType: string;
}

const TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 5;

// Rotate through realistic user agents to reduce blocking
const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
];

function randomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export async function crawlUrl(url: string): Promise<CrawlResult> {
  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported");
  }

  const response = await axios.get(url, {
    timeout: TIMEOUT_MS,
    maxRedirects: MAX_REDIRECTS,
    headers: {
      "User-Agent": randomUserAgent(),
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "no-cache",
    },
    // Don't throw on 4xx/5xx - we'll handle them
    validateStatus: (status) => status < 600,
  });

  const contentType = (response.headers["content-type"] as string) || "";
  const statusCode = response.status;

  if (statusCode >= 400) {
    throw new Error(`HTTP ${statusCode}: ${url}`);
  }

  let content = "";
  let title = "";

  if (contentType.includes("text/html")) {
    const $ = cheerio.load(response.data as string);

    // Extract title
    title = $("title").text().trim();

    // Remove noise elements
    $(
      "script, style, noscript, iframe, nav, footer, header, [aria-hidden='true']"
    ).remove();
    $(".cookie-banner, .popup, .modal, .advertisement, .ad, .ads").remove();

    // Prefer main content areas
    const mainSelectors = [
      "main",
      "article",
      '[role="main"]',
      "#main-content",
      "#content",
      ".content",
      ".main",
    ];

    let mainContent = "";
    for (const sel of mainSelectors) {
      const el = $(sel);
      if (el.length) {
        mainContent = el.text();
        break;
      }
    }

    // Fall back to body text
    if (!mainContent || mainContent.trim().length < 100) {
      mainContent = $("body").text();
    }

    // Clean up whitespace
    content = mainContent
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\t+/g, " ")
      .replace(/ {3,}/g, "  ")
      .trim();
  } else if (contentType.includes("application/json")) {
    content = JSON.stringify(response.data, null, 2);
    title = url;
  } else if (contentType.includes("text/")) {
    content = String(response.data);
    title = url;
  } else {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  if (!content || content.trim().length < 20) {
    throw new Error(
      "Page content is empty or too short. The page may require JavaScript rendering."
    );
  }

  return { content, title, statusCode, contentType };
}

// Rate-limit helper: pause between requests
export async function rateLimitedCrawl(
  url: string,
  delayMs = 1000
): Promise<CrawlResult> {
  await new Promise((r) => setTimeout(r, delayMs));
  return crawlUrl(url);
}
