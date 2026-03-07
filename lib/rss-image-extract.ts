/**
 * Extracts primary image URL from RSS feed items and web pages.
 * Used to append [Source Image URL: https...] to content for draft prompts.
 */

const IMAGE_TYPES = /^image\/(jpeg|jpg|png|gif|webp|avif)$/i;

export interface RssItemWithMedia {
  enclosure?: { url?: string; type?: string };
  "media:content"?: unknown;
  mediaContent?: unknown;
}

/**
 * Extract primary image URL from an RSS item.
 * Checks: enclosure (image type), media:content (Media RSS).
 */
export function extractImageFromRssItem(item: RssItemWithMedia): string | null {
  // 1. Standard RSS enclosure (image type)
  const enc = item.enclosure;
  if (enc?.url && enc.type && IMAGE_TYPES.test(enc.type)) {
    const url = String(enc.url).trim();
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
  }

  // 2. Media RSS media:content (can be array or single object)
  const media = item["media:content"] ?? item.mediaContent;
  if (!media) return null;

  const extractUrl = (m: unknown): string | null => {
    if (!m || typeof m !== "object") return null;
    const o = m as Record<string, unknown>;
    // media:content often has $ with attributes, or direct url
    const attrs = o.$ as Record<string, string> | undefined;
    if (attrs?.url) {
      const u = String(attrs.url).trim();
      if (u.startsWith("http")) return u;
    }
    if (typeof o.url === "string") {
      const u = o.url.trim();
      if (u.startsWith("http")) return u;
    }
    return null;
  };

  if (Array.isArray(media)) {
    for (const m of media) {
      const url = extractUrl(m);
      if (url) return url;
    }
  } else {
    return extractUrl(media);
  }

  return null;
}

/**
 * Fetch a URL's HTML and extract og:image meta tag.
 * Used when content has "Source: https://..." but no RSS image.
 */
export async function extractOgImageFromUrl(pageUrl: string): Promise<string | null> {
  const trimmed = pageUrl.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return null;

  try {
    const res = await fetch(trimmed, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; designermeow/1.0)" },
    });
    if (!res.ok) return null;

    const html = await res.text();
    // Match og:image content
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch?.[1]) {
      const url = ogMatch[1].trim();
      if (url.startsWith("http")) return url;
      if (url.startsWith("//")) return `https:${url}`;
    }
  } catch {
    // Ignore fetch errors
  }
  return null;
}

/**
 * If content has "Source: [URL]" and no [Source Image URL] yet, fetch og:image and append.
 */
export async function augmentIdeaWithSourceImage(idea: string): Promise<string> {
  if (idea.includes("[Source Image URL:")) return idea;

  const sourceMatch = idea.match(/Source:\s*(https?:\/\/[^\s\n]+)/i);
  if (!sourceMatch?.[1]) return idea;

  const imageUrl = await extractOgImageFromUrl(sourceMatch[1]);
  if (!imageUrl) return idea;

  return `${idea}\n\n[Source Image URL: ${imageUrl}]`;
}

/** Extract [Source Image URL: https...] from content. Returns null if not found. */
export function extractSourceImageUrlFromContent(content: string): string | null {
  const match = content.match(/\[Source Image URL:\s*(https?:\/\/[^\]]+)\]/i);
  if (!match?.[1]) return null;
  const url = match[1].trim();
  return url.startsWith("http") ? url : null;
}

/** Remove [Source Image URL: ...] from content when user opts out of real images. */
export function stripSourceImageUrlFromContent(content: string): string {
  return content.replace(/\n\n\[Source Image URL:\s*https?:\/\/[^\]]+\]/gi, "").trim();
}
