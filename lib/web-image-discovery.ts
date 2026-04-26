/**
 * Discover a small set of real image URLs related to a post brief (for optional Important Assets).
 * Search query: Gemini summarizes the brief; images: Google Programmable Search (optional) or Wikimedia Commons.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { MAX_CONTENT_IDEA_CHARS } from "@/lib/constants";

const WEB_IMAGE_TARGET = 5;
const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp|gif)$/i;
const WIKI_UA = "designermeow/1.0 (create-post web images)";

const LATIN_STOPWORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was", "one", "our", "out",
  "day", "get", "has", "him", "his", "how", "its", "may", "new", "now", "old", "see", "two", "way",
  "who", "did", "let", "put", "say", "she", "too", "use", "www", "com", "org", "txt", "amp",
  "story", "stories", "hook", "hooks", "slide", "slides", "post", "caption",
]);

/** Generic social / template words that hurt Commons image search. */
const IMAGE_QUERY_NOISE = new Set([
  "story", "stories", "hook", "hooks", "slide", "slides", "carousel", "post", "posts", "caption",
  "instagram", "reel", "reels", "content", "brief", "template", "cta", "engagement", "viral",
]);

function stripNoiseForSearch(s: string): string {
  return s
    .replace(/https?:\/\/[^\s]+/g, " ")
    .replace(/\[Source Image URL:[^\]]+\]/gi, " ")
    .replace(/Source:\s*[^\n]+/gi, " ")
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when the string is unsuitable as a Commons / image-API query (model echoed the brief, CJK blob, etc.). */
function isUnsuitableImageSearchQuery(q: string): boolean {
  const t = q.trim();
  if (t.length < 2 || t.length > 96) return true;
  const nonSpace = t.replace(/\s/g, "");
  if (!nonSpace.length) return true;
  let cjk = 0;
  for (const ch of nonSpace) {
    if (/[\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(ch)) cjk++;
  }
  if (cjk > 0 && cjk / nonSpace.length > 0.08) return true;
  const wordish = t.split(/\s+/).filter(Boolean);
  if (wordish.length > 14) return true;
  return false;
}

/** Model sometimes returns the user's brief instead of keywords — unusable for Commons. */
function queryLooksLikeEchoOfBrief(query: string, brief: string): boolean {
  const q = query.trim();
  const b = brief.trim();
  if (q.length < 24 || b.length < 24) return false;
  if (q.length > 180) return true;
  const head = q.slice(0, Math.min(48, q.length));
  return b.includes(head);
}

/**
 * Pull Latin tokens from a mixed brief (brand names, places) when the model returns garbage.
 */
function latinKeywordsFromBrief(brief: string): string {
  const cleaned = stripNoiseForSearch(brief).slice(0, 800);
  const matches = cleaned.match(/[A-Za-z][A-Za-z0-9.-]{1,}/g) ?? [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of matches) {
    const low = w.toLowerCase();
    if (w.length < 2 || LATIN_STOPWORDS.has(low)) continue;
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(w);
    if (out.length >= 10) break;
  }
  return out.join(" ").trim();
}

function fallbackKeywordsFromBrief(brief: string): string {
  const latin = latinKeywordsFromBrief(brief);
  if (latin.length >= 3) return latin.slice(0, 96);

  const t = stripNoiseForSearch(brief).slice(0, 200);
  const words = t.split(/\s+/).filter((w) => w.length > 1).slice(0, 12);
  const joined = words.join(" ").trim();
  return joined.slice(0, 96) || "photography";
}

function normalizeOneLineModelOutput(raw: string): string {
  return stripNoiseForSearch(
    raw
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "")
      .split(/\n/)[0]!
      .replace(/^[^:]+:\s*/, "")
  ).slice(0, 96);
}

/** Remove low-value tokens so Commons gets e.g. "Swoop Africa funding" not "Story Swoop Hook". */
function stripWeakImageQueryTokens(q: string): string {
  const parts = q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => !IMAGE_QUERY_NOISE.has(w.replace(/[^a-zA-Z0-9.-]/g, "").toLowerCase()));
  const out = parts.join(" ").trim();
  return out.length >= 3 ? out : q.trim();
}

/**
 * Commons File search returns many PDFs; Cirrus filemime filter surfaces real bitmaps.
 * @see https://www.mediawiki.org/wiki/Help:CirrusSearch#filemime
 */
function withCommonsBitmapMimeFilter(keywords: string): string {
  const k = keywords.trim();
  if (!k) return "filemime:image/jpeg";
  if (/filemime:/i.test(k)) return k;
  return `${k} filemime:image/jpeg`.slice(0, 280);
}

/**
 * One short English-focused search phrase for stock/wiki image APIs.
 */
export async function extractImageSearchQueryFromBrief(brief: string): Promise<string> {
  const trimmed = brief.trim().slice(0, MAX_CONTENT_IDEA_CHARS);
  if (!trimmed) return "photography";

  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    return (
      stripWeakImageQueryTokens(fallbackKeywordsFromBrief(trimmed)).slice(0, 96).trim() || "photography"
    );
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const runPrompt = async (instruction: string) => {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: instruction }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 128 },
    });
    return normalizeOneLineModelOutput(result.response.text());
  };

  try {
    const primary = await runPrompt(`Output ONLY a short English image search query (5–10 words, space-separated). Use Latin letters only. No Chinese, Japanese, or Korean. No emojis, labels, or explanation—just the keywords. Good for Wikimedia Commons photos.

Include scene context (e.g. startup office, Africa business, university campus)—not a brand name alone if that name is a common English word.

Brief:
${trimmed}`);

    let q = primary;
    if (!q || isUnsuitableImageSearchQuery(q) || queryLooksLikeEchoOfBrief(q, trimmed)) {
      const strict = await runPrompt(`The text below may be Chinese or mixed. Output ONLY 5–8 English words to find relevant stock-style photographs (people, cities, technology, business). Latin letters and spaces only. Nothing else.

${trimmed}`);
      q = strict;
    }

    if (!q || isUnsuitableImageSearchQuery(q) || queryLooksLikeEchoOfBrief(q, trimmed)) {
      const latin = latinKeywordsFromBrief(trimmed);
      q = latin.length >= 3 ? latin : fallbackKeywordsFromBrief(trimmed);
      console.warn(
        "[web-image-discovery] Model query unusable; using Latin/fallback keywords:",
        q.slice(0, 80)
      );
    }

    return stripWeakImageQueryTokens(q).slice(0, 96).trim() || "photography";
  } catch {
    const fb = fallbackKeywordsFromBrief(trimmed);
    return stripWeakImageQueryTokens(fb).slice(0, 96).trim() || "photography";
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
 * Tries shorter keyword prefixes when Cirrus returns no hits (AND + filemime is strict).
 */
async function searchWikimediaCommonsImages(keywords: string, num: number): Promise<string[]> {
  const parts = keywords.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return [];

  const maxPrefix = Math.min(8, parts.length);
  const budgets: number[] = [];
  for (let w = maxPrefix; w >= 1; w--) {
    if (!budgets.includes(w)) budgets.push(w);
  }

  const out: string[] = [];
  const seen = new Set<string>();
  let lastSrsearch = "";

  for (const wordCount of budgets) {
    if (out.length >= num) break;
    const chunk = parts.slice(0, wordCount).join(" ").trim();
    if (!chunk) continue;
    const srsearch = withCommonsBitmapMimeFilter(chunk);
    lastSrsearch = srsearch;

    const searchParams = new URLSearchParams({
      action: "query",
      format: "json",
      list: "search",
      srsearch,
      srnamespace: "6",
      srlimit: "25",
      origin: "*",
    });

    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${searchParams}`, {
      headers: { "User-Agent": WIKI_UA },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn("[web-image-discovery] Wikimedia search HTTP", res.status);
      continue;
    }

    const searchData = (await res.json()) as { query?: { search?: Array<{ title?: string }> } };
    const titles = (searchData.query?.search ?? [])
      .map((s) => s.title?.trim())
      .filter((t): t is string => Boolean(t));
    if (titles.length === 0) continue;

    const chunkSize = 10;
    for (let i = 0; i < titles.length && out.length < num; i += chunkSize) {
      const titleChunk = titles.slice(i, i + chunkSize);
      const infoParams = new URLSearchParams({
        action: "query",
        format: "json",
        titles: titleChunk.join("|"),
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
  }

  if (out.length === 0 && lastSrsearch) {
    console.warn("[web-image-discovery] Wikimedia: no File hits after prefix tries, last query:", lastSrsearch.slice(0, 120));
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
  let query = stripWeakImageQueryTokens(await extractImageSearchQueryFromBrief(brief)).slice(0, 96).trim();
  if (!query || isUnsuitableImageSearchQuery(query) || queryLooksLikeEchoOfBrief(query, brief)) {
    const latin = latinKeywordsFromBrief(brief);
    const fb = latin.length >= 3 ? latin : fallbackKeywordsFromBrief(brief);
    query = stripWeakImageQueryTokens(fb).slice(0, 96).trim() || "photography";
    console.warn("[web-image-discovery] Sanitized search query after extract:", query.slice(0, 80));
  }
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
