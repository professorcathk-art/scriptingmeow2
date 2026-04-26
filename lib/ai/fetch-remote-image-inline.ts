/**
 * Fetch remote images for Gemini inlineData. Node's fetch often sends no User-Agent;
 * many hosts return 403 or empty responses without a browser-like UA.
 *
 * Defaults favor fast failure + bounded payload so serverless routes (e.g. Vercel) stay within time limits.
 */

/** Chrome-like UA — CDNs and hotlink guards frequently require this. */
export const BROWSER_LIKE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const DEFAULT_TIMEOUT_MS = 12_000;
/** Cap per image so 5 refs do not create a multi‑MB JSON body that stalls or kills the function. */
const DEFAULT_MAX_BYTES = 2_500_000;

const IMAGE_ACCEPT = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8";

function imageFetchInit(timeoutMs: number): RequestInit {
  return {
    headers: {
      "User-Agent": BROWSER_LIKE_USER_AGENT,
      Accept: IMAGE_ACCEPT,
    },
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
  };
}

async function readResponseBodyWithLimit(res: Response, maxBytes: number): Promise<Buffer | null> {
  const cl = res.headers.get("content-length");
  if (cl) {
    const n = parseInt(cl, 10);
    if (!Number.isNaN(n) && n > maxBytes) return null;
  }
  if (!res.body) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > maxBytes) return null;
    return buf;
  }
  const reader = res.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value?.length) {
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(Buffer.from(value));
    }
  }
  if (chunks.length === 0) return null;
  return Buffer.concat(chunks);
}

export type FetchImageInlineOptions = {
  logLabel?: string;
  /** Default 12s — long hangs × many URLs × retries exceed typical serverless budgets. */
  timeoutMs?: number;
  /** Default 2.5MB per image. */
  maxBytes?: number;
};

/**
 * Download an image URL and return a Gemini content part, or null on failure.
 * Retries once on network/timeout errors (not on HTTP 4xx/5xx or oversize bodies).
 */
export async function fetchImageAsGeminiInlinePart(
  url: string,
  options?: FetchImageInlineOptions
): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;

  const label = options?.logLabel ?? "[fetch-image]";
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, imageFetchInit(timeoutMs));
      if (!res.ok) {
        console.warn(`${label} HTTP ${res.status} for`, url.slice(0, 120));
        return null;
      }
      const buf = await readResponseBodyWithLimit(res, maxBytes);
      if (!buf) {
        console.warn(`${label} empty or too large (>${maxBytes}b) for`, url.slice(0, 120));
        return null;
      }
      const base64 = buf.toString("base64");
      const contentType = res.headers.get("content-type") || "image/jpeg";
      const mimeType = contentType.includes("png")
        ? "image/png"
        : contentType.includes("webp")
          ? "image/webp"
          : "image/jpeg";
      return { inlineData: { mimeType, data: base64 } };
    } catch (e) {
      if (attempt === 1) {
        console.warn(`${label} failed for`, url.slice(0, 120), e);
        return null;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  return null;
}
