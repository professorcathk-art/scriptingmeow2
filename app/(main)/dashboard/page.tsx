import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BrandbookCta } from "@/components/brandbook-cta";
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

  const { data: recentPosts } = await supabase
    .from("generated_posts")
    .select("*, brand_spaces(name)")
    .eq("status", "saved")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

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

      {recentPosts && recentPosts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">
            Recent Posts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPosts.map((post: any) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}/review`}
                className="group block p-4 rounded-xl glass border border-white/5 hover:border-white/10 transition-all"
              >
                <div className="aspect-square bg-white/5 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {post.visual_url ? (
                    <img
                      src={post.visual_url}
                      alt="Post visual"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-zinc-500 text-sm">No visual</span>
                  )}
                </div>
                <p className="text-sm font-medium text-white mb-1">
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
