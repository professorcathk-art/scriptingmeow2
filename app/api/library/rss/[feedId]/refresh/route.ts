import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Parser from "rss-parser";

export const dynamic = "force-dynamic";

const parser = new Parser();

/**
 * POST /api/library/rss/[feedId]/refresh - Re-fetch and parse RSS feed
 */
export async function POST(
  _request: Request,
  { params }: { params: { feedId: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: feed } = await supabase
      .from("user_rss_feeds")
      .select("id, rss_url")
      .eq("id", params.feedId)
      .eq("user_id", user.id)
      .single();

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const parsed = await parser.parseURL(feed.rss_url);

    await supabase
      .from("user_rss_ideas")
      .delete()
      .eq("rss_feed_id", params.feedId);

    const items = (parsed.items || []).slice(0, 50);
    for (const item of items) {
      const content = [item.title, item.contentSnippet || item.content]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 2000);
      if (!content.trim()) continue;

      await supabase.from("user_rss_ideas").insert({
        user_id: user.id,
        rss_feed_id: params.feedId,
        content,
        title: item.title?.slice(0, 500) || null,
        link: item.link || null,
      });
    }

    await supabase
      .from("user_rss_feeds")
      .update({ last_fetched_at: new Date().toISOString() })
      .eq("id", params.feedId);

    const { data: ideas } = await supabase
      .from("user_rss_ideas")
      .select("id, content, title, link, created_at")
      .eq("rss_feed_id", params.feedId)
      .order("created_at", { ascending: false });

    return NextResponse.json({ ideas: ideas ?? [] });
  } catch (error) {
    console.error("Error refreshing RSS:", error);
    return NextResponse.json(
      { error: "Failed to refresh feed" },
      { status: 500 }
    );
  }
}
