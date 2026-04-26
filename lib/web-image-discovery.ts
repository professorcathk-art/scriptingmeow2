/**
 * Discover a small set of real image URLs related to a post brief (for optional Important Assets).
 * Search query: Gemini summarizes the brief; images: Google Programmable Search (optional) or Wikimedia Commons.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { MAX_CONTENT_IDEA_CHARS } from "@/lib/constants";

const WEB_IMAGE_TARGET = 5;
const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp|gif)$/i;
const WIKI_UA = "designermeow/1.0 (create-post web images)";

function fallbackKeywordsFromBrief(brief: string): string {
  const t = brief
    .replace(/https?:\/\/[^\s]+/g, " ")
    .replace(/\[Source Image URL:[^\]]+\]/gi, " ")
    .replace(/Source:\s*[^\n]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  const words = t.split(/\s+/).filter((w) => w.length > 1).slice(0, 12);
  return words.join(" ").trim() || "photography";
}

/**
 * One short English-focused search phrase for stock/wiki image APIs.
 */
export async function extractImageSearchQueryFromBrief(brief: string): Promise<string> {
  const trimmed = brief.trim().slice(0, MAX_CONTENT_IDEA_CHARS);
  if (!trimmed) return "photography";

  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return fallbackKeywordsFromBrief(trimmed);

  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `You output exactly one line: a concise image search query in English (max 10 words) to find real photographs or illustrations relevant to this social media post brief. No quotes, no explanation.

Brief:
${trimmed}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.25, maxOutputTokens: 64 },
    });
    const text = result.response
      .text()
      .trim()
      .replace(/^["']|["']$/g, "")
      .split(/\n/)[0]
      .slice(0, 120)
      .trim();
    return text || fallbackKeywordsFromBrief(trimmed);
  } catch {
    return fallbackKeywordsFromBrief(trimmed);
  }
}

async function searchGoogleProgrammableImageSearch(
  query: string,
  num: number
): Promise<string[] | null> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY?.trim();
  const cx = process.env.GOOGLE_CSE_CX?.trim();
  if (!apiKey || !cx) return null;

  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    searchType: "image",
    num: String(Math.min(10, Math.max(1, num + 3))),
    safe: "active",
  });

  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    console.warn("[web-image-discovery] Google CSE error:", res.status);
    return null;
  }

  const data = (await res.json()) as { items?: Array<{ link?: string; mime?: string }> };
  const out: string[] = [];
  const seen = new Set<string>();
  for (const it of data.items ?? []) {
    const link = it.link?.trim();
    if (!link || (!link.startsWith("http://") && !link.startsWith("https://"))) continue;
    const mime = it.mime || "";
    if (mime && !ALLOWED_MIME.test(mime)) continue;
    if (seen.has(link)) continue;
    seen.add(link);
    out.push(link);
    if (out.length >= num) break;
  }
  return out.length > 0 ? out : null;
}

type WikiPage = {
  imageinfo?: Array<{ url?: string; mime?: string }>;
};

/**
 * Wikimedia: list=search in File namespace, then batched prop=imageinfo (reliable across regions vs generator=search alone).
 */
async function searchWikimediaCommonsImages(query: string, num: number): Promise<string[]> {
  const searchParams = new URLSearchParams({
    action: "query",
    format: "json",
    list: "search",
    srsearch: query,
    srnamespace: "6",
    srlimit: "20",
    origin: "*",
  });

  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${searchParams}`, {
    headers: { "User-Agent": WIKI_UA },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    console.warn("[web-image-discovery] Wikimedia search HTTP", res.status);
    return [];
  }

  const searchData = (await res.json()) as { query?: { search?: Array<{ title?: string }> } };
  const titles = (searchData.query?.search ?? [])
    .map((s) => s.title?.trim())
    .filter((t): t is string => Boolean(t));
  if (titles.length === 0) {
    console.warn("[web-image-discovery] Wikimedia: no File hits for query:", query.slice(0, 100));
    return [];
  }

  const out: string[] = [];
  const seen = new Set<string>();
  const chunkSize = 10;

  for (let i = 0; i < titles.length && out.length < num; i += chunkSize) {
    const chunk = titles.slice(i, i + chunkSize);
    const infoParams = new URLSearchParams({
      action: "query",
      format: "json",
      titles: chunk.join("|"),
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: "1200",
      origin: "*",
    });

    const infoRes = await fetch(`https://commons.wikimedia.org/w/api.php?${infoParams}`, {
      headers: { "User-Agent": WIKI_UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!infoRes.ok) continue;

    const infoData = (await infoRes.json()) as { query?: { pages?: Record<string, WikiPage> } };
    const pages = infoData.query?.pages ?? {};

    for (const page of Object.values(pages)) {
      if ("missing" in page) continue;
      const info = page.imageinfo?.[0];
      const url = info?.url?.trim();
      const mime = info?.mime || "";
      if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) continue;
      if (mime) {
        if (!ALLOWED_MIME.test(mime)) continue;
      } else if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test((url.split("?")[0] ?? ""))) {
        continue;
      }
      if (seen.has(url)) continue;
      seen.add(url);
      out.push(url);
      if (out.length >= num) break;
    }
  }

  return out;
}

export type WebImageDiscoveryResult = {
  urls: string[];
  query: string;
  source: "google" | "wikimedia";
};

/**
 * Returns up to `maxResults` distinct image URLs (default 5).
 */
export async function discoverWebImageUrlsForPostBrief(
  brief: string,
  maxResults = WEB_IMAGE_TARGET
): Promise<WebImageDiscoveryResult> {
  const query = await extractImageSearchQueryFromBrief(brief);
  const n = Math.min(10, Math.max(1, maxResults));

  const google = await searchGoogleProgrammableImageSearch(query, n);
  if (google && google.length > 0) {
    return { urls: google.slice(0, n), query, source: "google" };
  }

  let wiki = await searchWikimediaCommonsImages(query, n);
  if (wiki.length === 0) {
    const fallback = fallbackKeywordsFromBrief(brief);
    if (fallback !== query) {
      wiki = await searchWikimediaCommonsImages(fallback, n);
      if (wiki.length > 0) {
        return { urls: wiki.slice(0, n), query: fallback, source: "wikimedia" };
      }
    }
    console.warn("[web-image-discovery] Wikimedia: empty after primary and fallback query");
  }

  return { urls: wiki.slice(0, n), query, source: "wikimedia" };
}
