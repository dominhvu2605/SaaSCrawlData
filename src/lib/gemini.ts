import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

export interface ExtractedData {
  headers: string[];
  rows: string[][];
  summary: string;
  totalItems: number;
}

const MAX_CONTENT_CHARS = 60_000; // ~15k tokens, safe for gemini-1.5-flash

export async function extractDataWithGemini(
  pageContent: string,
  contentRequest: string,
  url: string,
  existingHeaders?: string[]
): Promise<ExtractedData> {
  const model = genAI.getGenerativeModel({ model: MODEL });

  // Truncate if too large
  const truncated = pageContent.slice(0, MAX_CONTENT_CHARS);
  const wasTruncated = pageContent.length > MAX_CONTENT_CHARS;

  const headerInstruction = existingHeaders && existingHeaders.length > 0
    ? `IMPORTANT: Use EXACTLY these column headers in this exact order: ${JSON.stringify(existingHeaders)}. Do NOT add, remove, or rename any column.`
    : `3. Headers should be concise, descriptive column names`;

  const prompt = `You are a data extraction assistant. Extract structured data from the webpage content below.

URL: ${url}
User request: "${contentRequest}"
${wasTruncated ? "(Note: Content was truncated to fit context window)" : ""}

WEBPAGE CONTENT:
${truncated}

INSTRUCTIONS:
1. Extract exactly what the user requested from the content
2. Return a JSON object with this exact structure:
{
  "headers": ["column1", "column2", ...],
  "rows": [["value1", "value2", ...], ...],
  "summary": "Brief summary of what was extracted",
  "totalItems": <number of rows extracted>
}
${headerInstruction}
4. Each row must have the same number of elements as headers
5. Use empty string "" for missing values
6. Return ONLY the JSON, no markdown code blocks, no extra text
7. If no relevant data found, return: {"headers": ["message"], "rows": [["No data matching the request was found"]], "summary": "No matching data", "totalItems": 0}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // Strip markdown code blocks if present
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const parsed: ExtractedData = JSON.parse(cleaned);

  // Validate structure
  if (!Array.isArray(parsed.headers) || !Array.isArray(parsed.rows)) {
    throw new Error("Gemini returned invalid data structure");
  }

  return {
    headers: parsed.headers,
    rows: parsed.rows,
    summary: parsed.summary || "",
    totalItems: parsed.totalItems ?? parsed.rows.length,
  };
}

// Retry with exponential backoff for transient Gemini errors
export async function extractWithRetry(
  pageContent: string,
  contentRequest: string,
  url: string,
  existingHeaders?: string[],
  maxRetries = 3
): Promise<ExtractedData> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await extractDataWithGemini(pageContent, contentRequest, url, existingHeaders);
    } catch (err) {
      lastError = err as Error;
      const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError ?? new Error("Gemini extraction failed after retries");
}
