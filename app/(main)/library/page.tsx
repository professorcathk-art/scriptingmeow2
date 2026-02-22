import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { LibraryFilters } from "@/components/library/library-filters";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { brand?: string; tag?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  let query = supabase
    .from("generated_posts")
    .select("*, brand_spaces(name)")
    .eq("status", "saved")
    .order("created_at", { ascending: false });

  if (searchParams.brand) {
    query = query.eq("brand_space_id", searchParams.brand);
  }

  if (searchParams.tag) {
    query = query.contains("tags", [searchParams.tag]);
  }

  const { data: posts } = await query;

  const { data: brandSpaces } = await supabase
    .from("brand_spaces")
    .select("id, name")
    .eq("user_id", user.id);

  // Get all unique tags
  const allTags = new Set<string>();
  posts?.forEach((post: any) => {
    if (Array.isArray(post.tags)) {
      post.tags.forEach((tag: string) => allTags.add(tag));
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Library</h1>
          <p className="text-gray-600 mt-1">
            Your saved Instagram posts
          </p>
        </div>
        <Link
          href="/create-post"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Create New Post
        </Link>
      </div>

      <Suspense fallback={<div className="bg-white p-4 rounded-lg border">Loading filters...</div>}>
        <LibraryFilters
          brandSpaces={brandSpaces || []}
          tags={Array.from(allTags)}
          currentBrand={searchParams.brand}
          currentTag={searchParams.tag}
        />
      </Suspense>

      {posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post: any) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}/review`}
              className="block bg-white rounded-lg border hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-100 rounded-t-lg flex items-center justify-center overflow-hidden">
                {post.visual_url ? (
                  <img
                    src={post.visual_url}
                    alt="Post visual"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400">No visual</span>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  {post.brand_spaces?.name || "Unknown Brand"}
                </p>
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                  {post.content_idea}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{formatDate(post.created_at)}</span>
                  {post.tags && post.tags.length > 0 && (
                    <span className="text-blue-600">
                      {post.tags.length} tag{post.tags.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed">
          <p className="text-gray-600 mb-4">No saved posts yet.</p>
          <Link
            href="/create-post"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Post
          </Link>
        </div>
      )}
    </div>
  );
}
