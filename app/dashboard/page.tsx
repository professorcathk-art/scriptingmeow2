import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

  const brandSpaceCount = brandSpaces?.length || 0;
  const brandSpaceLimit = userProfile
    ? PLAN_LIMITS[userProfile.plan_tier as PlanTier].brand_spaces
    : 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back!
        </h1>
        <p className="text-gray-600">
          Create consistent, on-brand Instagram posts in a few clicks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          href="/brand-spaces"
          className="block p-6 bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Brand Spaces</h2>
          <p className="text-gray-600 mb-4">
            {brandSpaceCount} / {brandSpaceLimit} used
          </p>
          <p className="text-sm text-blue-600">Manage your brands →</p>
        </Link>

        <Link
          href="/create-post"
          className="block p-6 bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Create Post</h2>
          <p className="text-gray-600 mb-4">
            Generate new Instagram posts
          </p>
          <p className="text-sm text-blue-600">Start creating →</p>
        </Link>

        <Link
          href="/library"
          className="block p-6 bg-white rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 transition-colors"
        >
          <h2 className="text-xl font-semibold mb-2">Library</h2>
          <p className="text-gray-600 mb-4">
            {recentPosts?.length || 0} saved posts
          </p>
          <p className="text-sm text-blue-600">View all →</p>
        </Link>
      </div>

      {recentPosts && recentPosts.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentPosts.map((post: any) => (
              <div
                key={post.id}
                className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow"
              >
                <div className="aspect-square bg-gray-100 rounded mb-3 flex items-center justify-center">
                  {post.visual_url ? (
                    <img
                      src={post.visual_url}
                      alt="Post visual"
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <span className="text-gray-400">No visual</span>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {post.brand_spaces?.name || "Unknown Brand"}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {post.content_idea}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
