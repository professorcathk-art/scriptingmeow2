/**
 * Fetch remote images for Gemini inlineData. Node's fetch often sends no User-Agent;
 * many hosts return 403 or empty responses without a browser-like UA.
 */

/** Chrome-like UA — CDNs and hotlink guards frequently require this. */
export const BROWSER_LIKE_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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

/**
 * Download an image URL and return a Gemini content part, or null on failure.
 * Retries once on network/timeout errors (not on HTTP 4xx/5xx).
 */
export async function fetchImageAsGeminiInlinePart(
  url: string,
  options?: { logLabel?: string }
): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;

  const label = options?.logLabel ?? "[fetch-image]";
  const timeoutMs = 28_000;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, imageFetchInit(timeoutMs));
      if (!res.ok) {
        console.warn(`${label} HTTP ${res.status} for`, url.slice(0, 120));
        return null;
      }
      const buf = Buffer.from(await res.arrayBuffer());
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
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}
