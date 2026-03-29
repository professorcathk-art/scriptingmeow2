import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreatePostForm } from "@/components/posts/create-post-form";
import { structuredIdeaToBrief, parseStructuredIdea } from "@/lib/idea-content";

export default async function CreatePostPage({
  searchParams,
}: {
  searchParams: { edit?: string; styleId?: string; contentIdea?: string; ideaId?: string; rssIdeaId?: string; templateId?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: brandSpaces } = await supabase
    .from("brand_spaces")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  let editPost: {
    id: string;
    brand_space_id: string;
    post_type: string;
    format: string;
    language: string;
    content_idea: string;
    draft_data: unknown;
    caption: unknown;
    carousel_urls?: string[] | null;
  } | null = null;
  if (searchParams.edit) {
    const { data: post } = await supabase
      .from("generated_posts")
      .select("id, brand_space_id, post_type, format, language, content_idea, draft_data, caption, carousel_urls")
      .eq("id", searchParams.edit)
      .single();
    if (post) {
      const { data: bs } = await supabase
        .from("brand_spaces")
        .select("id")
        .eq("id", post.brand_space_id)
        .eq("user_id", user.id)
        .single();
      if (bs) editPost = post;
    }
  }

  const { data: postIdeasRaw } = await supabase
    .from("user_post_ideas")
    .select("id, content, brand_space_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const brandNameById = new Map((brandSpaces ?? []).map((b) => [b.id, b.name]));
  const postIdeas = (postIdeasRaw ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    brand_space_id: row.brand_space_id,
    brandName: row.brand_space_id ? brandNameById.get(row.brand_space_id) ?? undefined : undefined,
  }));

  const isPaid = userProfile?.plan_tier !== "free";
  const { data: rssFeedsForIdeas } = isPaid
    ? await supabase
        .from("user_rss_feeds")
        .select("id, brand_space_id")
        .eq("user_id", user.id)
    : { data: [] };
  const rssFeedBrand = new Map((rssFeedsForIdeas ?? []).map((f) => [f.id, f.brand_space_id]));
  const { data: rssIdeasRaw } = isPaid
    ? await supabase
        .from("user_rss_ideas")
        .select("id, content, title, rss_feed_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };
  const rssIdeas = (rssIdeasRaw ?? []).map((r) => ({
    id: r.id,
    content: r.content,
    title: r.title,
    brand_space_id: r.rss_feed_id ? rssFeedBrand.get(r.rss_feed_id) ?? null : null,
    brandName: r.rss_feed_id
      ? brandNameById.get(rssFeedBrand.get(r.rss_feed_id) ?? "") ?? undefined
      : undefined,
  }));

  const { data: templates } = await supabase
    .from("post_templates")
    .select("id, name, brand_space_id, content_framework, post_style, post_type, format, custom_width, custom_height, carousel_page_count, carousel_pages")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: libraryPosts } = await supabase
    .from("generated_posts")
    .select("id, visual_url, carousel_urls, content_idea")
    .in("status", ["saved", "generated"])
    .in("brand_space_id", brandSpaces?.map((b) => b.id) ?? [])
    .order("created_at", { ascending: false })
    .limit(20);

  const prefillFromTryStyle =
    searchParams.styleId && searchParams.contentIdea
      ? { styleId: searchParams.styleId, contentIdea: searchParams.contentIdea }
      : undefined;

  let prefillIdeaContent: string | undefined;
  if (searchParams.ideaId) {
    const { data: idea } = await supabase
      .from("user_post_ideas")
      .select("content")
      .eq("id", searchParams.ideaId)
      .eq("user_id", user.id)
      .single();
    if (idea?.content) {
      const s = parseStructuredIdea(idea.content);
      prefillIdeaContent = s ? structuredIdeaToBrief(s) : idea.content;
    }
  }
  if (!prefillIdeaContent && searchParams.rssIdeaId) {
    const { data: rssIdea } = await supabase
      .from("user_rss_ideas")
      .select("content")
      .eq("id", searchParams.rssIdeaId)
      .eq("user_id", user.id)
      .single();
    if (rssIdea) prefillIdeaContent = rssIdea.content;
  }

  const rssIdeasForForm = rssIdeas;

  let prefillTemplate: {
    brandSpaceId: string;
    contentFramework: string;
    postStyle: string;
    postType: string;
    format: string;
    customWidth?: number;
    customHeight?: number;
    carouselPageCount: number;
    carouselPages?: import("@/lib/draft-data").DraftCarouselPageFields[];
  } | null = null;
  if (searchParams.templateId && templates?.length) {
    const t = templates.find((x) => x.id === searchParams.templateId);
    if (t) {
      prefillTemplate = {
        brandSpaceId: t.brand_space_id,
        contentFramework: t.content_framework ?? "educational-value",
        postStyle: t.post_style ?? "",
        postType: t.post_type,
        format: t.format,
        customWidth: t.custom_width ?? undefined,
        customHeight: t.custom_height ?? undefined,
        carouselPageCount: t.carousel_page_count ?? 3,
        carouselPages: Array.isArray(t.carousel_pages) ? t.carousel_pages : undefined,
      };
    }
  }

  if ((!brandSpaces || brandSpaces.length === 0) && !prefillFromTryStyle) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 p-4 md:p-8">
        <h1 className="text-3xl font-bold text-zinc-100 mb-4">
          Create Your First Brand Space
        </h1>
        <p className="text-zinc-400 mb-6">
          You need to create a Brand Space before generating posts.
        </p>
        <a
          href="/brand-spaces/new"
          className="inline-block px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90 transition-opacity"
        >
          Create Brand Space
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full p-4 md:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-4 sm:mb-6">Create Instagram Post</h1>
      <CreatePostForm
        brandSpaces={brandSpaces ?? []}
        userCredits={userProfile?.credits_remaining || 0}
        planTier={userProfile?.plan_tier || "free"}
        editPost={editPost}
        libraryPosts={libraryPosts ?? []}
        prefillFromTryStyle={prefillFromTryStyle}
        prefillIdeaContent={prefillIdeaContent}
        prefillTemplate={prefillTemplate}
        postIdeas={postIdeas}
        rssIdeas={rssIdeasForForm}
        templates={templates ?? []}
        skipDraftRestore={!editPost && !prefillFromTryStyle}
      />
    </div>
  );
}
