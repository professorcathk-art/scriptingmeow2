import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { LibraryFilters } from "@/components/library/library-filters";

function FolderIcon() {
  return (
    <svg
      className="w-16 h-16 text-zinc-500/40"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );
}

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

  const allTags = new Set<string>();
  posts?.forEach((post: { tags?: string[] }) => {
    if (Array.isArray(post.tags)) {
      post.tags.forEach((tag: string) => allTags.add(tag));
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Library</h1>
          <p className="text-zinc-400 mt-1">Your saved Instagram posts</p>
        </div>
        <Link
          href="/create-post"
          className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90 transition-opacity"
        >
          Create New Post
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/10">
            <p className="text-zinc-400">Loading filters...</p>
          </div>
        }
      >
        <LibraryFilters
          brandSpaces={brandSpaces || []}
          tags={Array.from(allTags)}
          currentBrand={searchParams.brand}
          currentTag={searchParams.tag}
        />
      </Suspense>

      {posts && posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post: {
            id: string;
            visual_url?: string;
            content_idea?: string;
            created_at: string;
            tags?: string[];
            brand_spaces?: { name?: string };
          }) => (
            <Link
              key={post.id}
              href={`/posts/${post.id}/review`}
              className="block bg-zinc-900/50 rounded-2xl border border-white/10 overflow-hidden hover:border-violet-500/30 transition-all"
            >
              <div className="aspect-square bg-zinc-800/50 flex items-center justify-center overflow-hidden">
                {post.visual_url ? (
                  <img
                    src={post.visual_url}
                    alt="Post visual"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-zinc-500">No visual</span>
                )}
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-zinc-100 mb-1">
                  {post.brand_spaces?.name || "Unknown Brand"}
                </p>
                <p className="text-xs text-zinc-500 mb-2 line-clamp-2">
                  {post.content_idea}
                </p>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>{formatDate(post.created_at)}</span>
                  {post.tags && post.tags.length > 0 && (
                    <span className="text-violet-400">
                      {post.tags.length} tag{post.tags.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-white/10 bg-transparent">
          <div className="w-24 h-24 rounded-full bg-zinc-800/30 flex items-center justify-center mb-6 border border-white/5">
            <FolderIcon />
          </div>
          <p className="text-zinc-400 mb-2 text-center max-w-sm">
            Your generated masterpieces will live here.
          </p>
          <p className="text-zinc-500 text-sm mb-6">
            Create your first post to get started
          </p>
          <Link
            href="/create-post"
            className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90 transition-opacity"
          >
            Create Your First Post
          </Link>
        </div>
      )}
    </div>
  );
}
