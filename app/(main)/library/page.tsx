import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { BrandbookCta } from "@/components/brandbook-cta";
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
  searchParams: { brand?: string; tab?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: userProfile } = await supabase
    .from("users")
    .select("plan_tier")
    .eq("id", user.id)
    .single();

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

  const { data: myDesignFolder } = await supabase
    .from("library_folders")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", "My design")
    .single();

  const { data: myDesignItems } = myDesignFolder
    ? await supabase
        .from("library_items")
        .select("id, image_url, created_at, metadata, source_id")
        .eq("folder_id", myDesignFolder.id)
        .order("created_at", { ascending: false })
    : { data: [] };

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

  // Ensure all props are JSON-serializable for Client Components (avoids Server Components render errors)
  type LibPost = { id: string; visual_url?: string; content_idea?: string; created_at: string; tags?: string[]; brand_spaces?: { name?: string } };
  type LibRef = { id: string; image_url: string; created_at: string; source: string };
  type LibIdea = { id: string; content: string; created_at: string };
  type LibDesign = { id: string; image_url: string; created_at: string; metadata?: Record<string, unknown>; source_id?: string | null };
  type LibBrand = { id: string; name: string };
  const serializablePosts = JSON.parse(JSON.stringify(posts ?? [])) as LibPost[];
  const serializableReferences = JSON.parse(JSON.stringify(references)) as LibRef[];
  const serializablePostIdeas = JSON.parse(JSON.stringify(postIdeas ?? [])) as LibIdea[];
  const serializableMyDesign = JSON.parse(JSON.stringify(myDesignItems ?? [])) as LibDesign[];
  const serializableBrandSpaces = JSON.parse(JSON.stringify(brandSpaces ?? [])) as LibBrand[];

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
        <BrandbookCta
          href={brandSpaces?.length ? `/brand-spaces/${brandSpaces[0].id}/brandbook` : "/brand-spaces/new"}
          title="Create your brandbook first"
          subtitle="Define your brand style for consistent posts"
          compact
        />
      )}

      <Suspense fallback={<div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/10"><p className="text-zinc-400">Loading...</p></div>}>
        <LibraryFilters
          brandSpaces={brandSpaces || []}
          currentBrand={searchParams.brand}
        />
      </Suspense>

      <LibraryTabs
        activeTab={typeof searchParams.tab === "string" ? searchParams.tab : "all"}
        posts={serializablePosts}
        references={serializableReferences}
        postIdeas={serializablePostIdeas}
        myDesignItems={serializableMyDesign}
        brandSpaces={serializableBrandSpaces}
        planTier={userProfile?.plan_tier ?? "free"}
      />
    </div>
  );
}
