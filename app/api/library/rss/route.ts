import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Parser from "rss-parser";
import { PLAN_LIMITS, type PlanTier } from "@/types/database";
import { extractImageFromRssItem } from "@/lib/rss-image-extract";

export const dynamic = "force-dynamic";

const parser = new Parser({
  customFields: {
    item: [["media:content", "mediaContent", { keepArray: true }]],
  },
});

/**
 * GET /api/library/rss - List user's RSS feeds and ideas (paid users only)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("plan_tier")
      .eq("id", user.id)
      .single();

    if (userProfile?.plan_tier === "free") {
      return NextResponse.json(
        { error: "RSS Autofeed is available for paid plans only" },
        { status: 403 }
      );
    }

    const { data: feeds } = await supabase
      .from("user_rss_feeds")
      .select("id, rss_url, title, created_at, last_fetched_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const feedIds = feeds?.map((f) => f.id) ?? [];
    const { data: ideas } =
      feedIds.length > 0
        ? await supabase
            .from("user_rss_ideas")
            .select("id, content, title, link, rss_feed_id, created_at")
            .in("rss_feed_id", feedIds)
            .order("created_at", { ascending: false })
        : { data: [] };

    const planTier = (userProfile?.plan_tier ?? "basic") as PlanTier;
    const rssLimit = PLAN_LIMITS[planTier].rss_feeds;

    return NextResponse.json({
      feeds: feeds ?? [],
      ideas: ideas ?? [],
      rssLimit,
    });
  } catch (error) {
    console.error("Error fetching RSS:", error);
    return NextResponse.json(
      { error: "Failed to fetch RSS data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/library/rss - Add RSS feed and fetch/parse (paid users only)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("plan_tier")
      .eq("id", user.id)
      .single();

    if (userProfile?.plan_tier === "free") {
      return NextResponse.json(
        { error: "RSS Autofeed is available for paid plans only" },
        { status: 403 }
      );
    }

    const planTier = (userProfile?.plan_tier ?? "basic") as PlanTier;
    const rssLimit = PLAN_LIMITS[planTier].rss_feeds;
    const { count } = await supabase
      .from("user_rss_feeds")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= rssLimit) {
      return NextResponse.json(
        { error: `RSS feed limit reached (${rssLimit} for ${planTier} plan). Upgrade for more.` },
        { status: 403 }
      );
    }

    const { rssUrl } = (await request.json()) as { rssUrl?: string };
    const url = (rssUrl || "").trim();
    if (!url || !url.startsWith("http")) {
      return NextResponse.json(
        { error: "Valid RSS URL required" },
        { status: 400 }
      );
    }

    let feed;
    try {
      feed = await parser.parseURL(url);
    } catch (e) {
      console.error("RSS parse error:", e);
      return NextResponse.json(
        { error: "Invalid or unreachable RSS feed" },
        { status: 400 }
      );
    }

    const { data: feedRecord, error: feedError } = await supabase
      .from("user_rss_feeds")
      .insert({
        user_id: user.id,
        rss_url: url,
        title: feed.title || url,
        last_fetched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (feedError || !feedRecord) {
      return NextResponse.json(
        { error: "Failed to save feed" },
        { status: 500 }
      );
    }

    const items = (feed.items || []).slice(0, 50);
    for (const item of items) {
      const baseContent = [item.title, item.contentSnippet || item.content]
        .filter(Boolean)
        .join("\n\n");
      const sourceLine = item.link ? `\n\nSource: ${item.link}` : "";
      const imageUrl = extractImageFromRssItem(item as Parameters<typeof extractImageFromRssItem>[0]);
      const imageLine = imageUrl ? `\n\n[Source Image URL: ${imageUrl}]` : "";
      const content = (baseContent + sourceLine + imageLine).slice(0, 2500);
      if (!content.trim()) continue;

      await supabase.from("user_rss_ideas").insert({
        user_id: user.id,
        rss_feed_id: feedRecord.id,
        content,
        title: item.title?.slice(0, 500) || null,
        link: item.link || null,
      });
    }

    const { data: ideas } = await supabase
      .from("user_rss_ideas")
      .select("id, content, title, link, created_at")
      .eq("rss_feed_id", feedRecord.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      feed: feedRecord,
      ideas: ideas ?? [],
    });
  } catch (error) {
    console.error("Error adding RSS:", error);
    return NextResponse.json(
      { error: "Failed to add RSS feed" },
      { status: 500 }
    );
  }
}
