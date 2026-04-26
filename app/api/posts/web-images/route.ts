import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { discoverWebImageUrlsForPostBrief } from "@/lib/web-image-discovery";
import { MAX_CONTENT_IDEA_CHARS } from "@/lib/constants";

/** Discovery runs Gemini plan + optional AIML (up to ~50s) + Wikimedia; 60s was too tight on Pro. */
export const maxDuration = 120;

/**
 * POST /api/posts/web-images
 * Authenticated: suggests a few real image URLs related to the post brief (for Important Assets).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { contentIdea?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const contentIdea = (body.contentIdea ?? "").trim().slice(0, MAX_CONTENT_IDEA_CHARS);
  if (!contentIdea) {
    return NextResponse.json({ error: "contentIdea is required" }, { status: 400 });
  }

  try {
    const { urls, query, source, queriesAttempted, hint } = await discoverWebImageUrlsForPostBrief(
      contentIdea,
      5
    );
    return NextResponse.json({ urls, query, source, queriesAttempted, hint });
  } catch (e) {
    console.error("[posts/web-images]", e);
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: "Failed to discover images", details: message },
      { status: 500 }
    );
  }
}
