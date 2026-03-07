import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { LibraryFilters } from "@/components/library/library-filters";
import { LibraryTabs } from "@/components/library/library-tabs";
import { SaveStyleOnLoad } from "@/components/library/save-style-on-load";

function FolderIcon() {
  return (
    <svg className="w-16 h-16 text-zinc-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: { brand?: string; tag?: string; tab?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: brandSpaces } = await supabase
    .from("brand_spaces")
    .select("id, name")
    .eq("user_id", user.id);

  const { data: brandbooks } = await supabase
    .from("brandbooks")
    .select("brand_space_id")
    .in("brand_space_id", brandSpaces?.map((b) => b.id) ?? []);

  const hasBrandbook = (brandbooks?.length ?? 0) > 0;

  let query = supabase
    .from("generated_posts")
    .select("*, brand_spaces(name)")
    .eq("status", "saved")
    .order("created_at", { ascending: false });

  if (searchParams.brand) query = query.eq("brand_space_id", searchParams.brand);
  if (searchParams.tag) query = query.contains("tags", [searchParams.tag]);

  const { data: posts } = await query;

  const brandSpaceIds = brandSpaces?.map((b) => b.id) ?? [];
  const { data: referenceImages } = brandSpaceIds.length > 0
    ? await supabase
        .from("brand_reference_images")
        .select("id, image_url, uploaded_at, brand_space_id")
        .in("brand_space_id", brandSpaceIds)
    : { data: [] };

  const brandSpaceMap = new Map((brandSpaces ?? []).map((b) => [b.id, b.name]));

  const { data: savedReferences } = await supabase
    .from("user_saved_references")
    .select("id, image_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: postIdeas } = await supabase
    .from("user_post_ideas")
    .select("id, content, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const allTags = new Set<string>();
  posts?.forEach((post: { tags?: string[] }) => {
    if (Array.isArray(post.tags)) post.tags.forEach((t: string) => allTags.add(t));
  });

  const references = [
    ...(referenceImages ?? []).map((r: { id: string; image_url: string; uploaded_at: string; brand_space_id: string }) => ({
      id: r.id,
      image_url: r.image_url,
      created_at: r.uploaded_at,
      source: brandSpaceMap.get(r.brand_space_id) ?? "Brand",
    })),
    ...(savedReferences ?? []).map((r: { id: string; image_url: string; created_at: string }) => ({
      id: `saved-${r.id}`,
      image_url: r.image_url,
      created_at: r.created_at,
      source: "Saved",
    })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <SaveStyleOnLoad />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">Library</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">Your posts, references, and idea bank</p>
        </div>
        <Link
          href="/create-post"
          className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90 transition-opacity text-center text-sm sm:text-base"
        >
          Create New Post
        </Link>
      </div>

      {!hasBrandbook && (
        <Link
          href={brandSpaces?.length ? `/brand-spaces/${brandSpaces[0].id}/brandbook` : "/brand-spaces/new"}
          className="block p-4 rounded-2xl bg-gradient-to-r from-violet-500/20 via-cyan-500/20 to-pink-500/20 border border-violet-500/30 text-center"
        >
          <p className="font-semibold text-white">Create your brandbook</p>
          <p className="text-sm text-zinc-400 mt-1">Define your brand style for consistent posts</p>
        </Link>
      )}

      <Suspense fallback={<div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/10"><p className="text-zinc-400">Loading...</p></div>}>
        <LibraryFilters
          brandSpaces={brandSpaces || []}
          tags={Array.from(allTags)}
          currentBrand={searchParams.brand}
          currentTag={searchParams.tag}
        />
      </Suspense>

      <LibraryTabs
        activeTab={(searchParams.tab as string) || "posts"}
        posts={posts ?? []}
        references={references}
        postIdeas={postIdeas ?? []}
        brandSpaces={brandSpaces ?? []}
        formatDate={formatDate}
      />
    </div>
  );
}
