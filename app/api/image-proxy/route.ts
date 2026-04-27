import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { BROWSER_LIKE_USER_AGENT } from "@/lib/ai/fetch-remote-image-inline";

const MAX_BYTES = 2_500_000;
const TIMEOUT_MS = 15_000;

function isUnsafeHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "0.0.0.0" || h === "[::1]" || h.endsWith(".localhost")) return true;
  if (h === "metadata.google.internal" || h.endsWith(".internal")) return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
  }
  return false;
}

function normalizeTargetUrl(raw: string): string | null {
  if (raw.length > 8000) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (isUnsafeHost(u.hostname)) return null;
  return u.toString();
}

function sniffMime(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "image/gif";
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

async function readBodyLimited(res: Response, maxBytes: number): Promise<Buffer | null> {
  const cl = res.headers.get("content-length");
  if (cl) {
    const n = parseInt(cl, 10);
    if (!Number.isNaN(n) && n > maxBytes) return null;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 && buf.length <= maxBytes ? buf : null;
  }
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

/**
 * GET /api/image-proxy?url=https://...
 * Authenticated thumbnail proxy: many news/CDN URLs block hotlinking in the browser but allow server fetch with UA.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const param = new URL(request.url).searchParams.get("url");
  if (!param) {
    return new NextResponse("Missing url", { status: 400 });
  }

  const target = normalizeTargetUrl(param);
  if (!target) {
    return new NextResponse("Invalid url", { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(target, {
      headers: {
        "User-Agent": BROWSER_LIKE_USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return new NextResponse("Fetch failed", { status: 502 });
  }

  if (!res.ok) {
    return new NextResponse("Upstream error", { status: 502 });
  }

  const ctRaw = res.headers.get("content-type") || "";
  if (/text\/html/i.test(ctRaw)) {
    return new NextResponse("Not an image", { status: 415 });
  }

  const buf = await readBodyLimited(res, MAX_BYTES);
  if (!buf?.length) {
    return new NextResponse("Empty or too large", { status: 413 });
  }

  let mediaType = ctRaw.split(";")[0].trim().toLowerCase();
  if (!mediaType.startsWith("image/")) {
    const sniffed = sniffMime(buf);
    if (!sniffed) {
      return new NextResponse("Not an image", { status: 415 });
    }
    mediaType = sniffed;
  }
  if (mediaType === "image/svg+xml") {
    return new NextResponse("Unsupported type", { status: 415 });
  }

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": mediaType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
