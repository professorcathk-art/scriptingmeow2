import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandbookCta } from "@/components/brandbook-cta";
import { InstagramHandleForm } from "@/components/billing/instagram-handle-form";
import { PLAN_LIMITS, type PlanTier } from "@/types/database";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: brandSpaces } = await supabase
    .from("brand_spaces")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: userProfile } = await supabase
    .from("users")
    .select("*, instagram_handle")
    .eq("id", user.id)
    .single();

  const instagramHandle = (userProfile as { instagram_handle?: string | null })?.instagram_handle ?? "";

  const { data: recentPosts } = await supabase
    .from("generated_posts")
    .select("*, brand_spaces(name)")
    .eq("status", "saved")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: postIdeas } = await supabase
    .from("user_post_ideas")
    .select("id, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const isPaid = userProfile?.plan_tier !== "free";
  const { data: rssFeeds } = isPaid
    ? await supabase
        .from("user_rss_feeds")
        .select("id, title, rss_url, last_fetched_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const feedIds = rssFeeds?.map((f) => f.id) ?? [];
  const { data: rssIdeas } = isPaid && feedIds.length > 0
    ? await supabase
        .from("user_rss_ideas")
        .select("id, title, content, link")
        .in("rss_feed_id", feedIds)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const { data: brandbooks } = await supabase
    .from("brandbooks")
    .select("brand_space_id")
    .in("brand_space_id", brandSpaces?.map((b) => b.id) ?? []);

  const hasBrandbook = (brandbooks?.length ?? 0) > 0;
  const brandSpaceCount = brandSpaces?.length || 0;
  const brandSpaceLimit = userProfile
    ? PLAN_LIMITS[userProfile.plan_tier as PlanTier].brand_spaces
    : 1;

  return (
    <div className="space-y-8">
      <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Profile</h2>
        <InstagramHandleForm initialHandle={instagramHandle} />
      </div>

      {!hasBrandbook && (
        <BrandbookCta
          href={brandSpaces?.length ? `/brand-spaces/${brandSpaces[0].id}/brandbook` : "/brand-spaces/new"}
          title="Create your brandbook first"
          subtitle={brandSpaces?.length ? "Define your brand style for consistent, on-brand posts" : "Create your first brand space, then add a brandbook for consistent posts"}
        />
      )}

      {/* Bento box - Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/brand-spaces"
          className="group relative p-6 rounded-2xl glass border border-white/5 hover:border-violet-500/30 transition-all duration-300 hover:shadow-glow overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <h2 className="text-xl font-semibold text-white mb-2">
              Brand Spaces
            </h2>
            <p className="text-zinc-400 text-sm mb-4">
              {brandSpaceCount} / {brandSpaceLimit} used
            </p>
            <p className="text-sm text-violet-400 group-hover:text-violet-300 transition-colors">
              Manage your brands →
            </p>
          </div>
        </Link>

        <Link
          href="/create-post"
          className="group relative p-6 rounded-2xl glass border border-white/5 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-glow-cyan overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <h2 className="text-xl font-semibold text-white mb-2">
              Create Post
            </h2>
            <p className="text-zinc-400 text-sm mb-4">
              Generate new Instagram posts
            </p>
            <p className="text-sm text-cyan-400 group-hover:text-cyan-300 transition-colors">
              Start creating →
            </p>
          </div>
        </Link>

        <Link
          href="/library"
          className="group relative p-6 rounded-2xl glass border border-white/5 hover:border-pink-500/30 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative">
            <h2 className="text-xl font-semibold text-white mb-2">
              Library
            </h2>
            <p className="text-zinc-400 text-sm mb-4">
              {recentPosts?.length || 0} saved posts
            </p>
            <p className="text-sm text-pink-400 group-hover:text-pink-300 transition-colors">
              View all →
            </p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center justify-between">
            Idea Bank
            <Link href="/library" className="text-sm text-violet-400 hover:text-violet-300 font-normal">
              View all →
            </Link>
          </h2>
          {postIdeas && postIdeas.length > 0 ? (
            <ul className="space-y-2">
              {postIdeas.map((idea) => (
                <li key={idea.id}>
                  <Link
                    href={`/create-post?ideaId=${idea.id}`}
                    className="block p-3 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-violet-500/30 text-sm text-zinc-300 line-clamp-2"
                  >
                    {idea.content}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-zinc-500 text-sm py-4">No ideas yet. Add ideas in Library.</p>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center justify-between">
            RSS Updates
            {isPaid && (
              <Link href="/library" className="text-sm text-violet-400 hover:text-violet-300 font-normal">
                Manage →
              </Link>
            )}
          </h2>
          {isPaid && rssIdeas && rssIdeas.length > 0 ? (
            <ul className="space-y-2">
              {rssIdeas.map((idea) => (
                <li key={idea.id}>
                  <Link
                    href={`/create-post?rssIdeaId=${idea.id}`}
                    className="block p-3 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-violet-500/30 text-sm text-zinc-300 line-clamp-2"
                  >
                    {idea.title || idea.content}
                  </Link>
                </li>
              ))}
            </ul>
          ) : isPaid ? (
            <p className="text-zinc-500 text-sm py-4">No RSS ideas. Add feeds in Library.</p>
          ) : (
            <p className="text-zinc-500 text-sm py-4">RSS Autofeed is for paid plans. Upgrade to add feeds.</p>
          )}
        </div>
      </div>

      {recentPosts && recentPosts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Recent Posts
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
            {recentPosts.map((post: { id: string; visual_url?: string; content_idea?: string; brand_spaces?: { name?: string } }) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}/review`}
                className="group block p-2 rounded-xl glass border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="aspect-square bg-white/5 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                  {post.visual_url ? (
                    <img
                      src={post.visual_url}
                      alt="Post visual"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-zinc-500 text-xs">No visual</span>
                  )}
                </div>
                <p className="text-xs font-medium text-white mb-0.5 truncate">
                  {post.brand_spaces?.name || "Unknown Brand"}
                </p>
                <p className="text-xs text-zinc-500 truncate">
                  {post.content_idea}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
