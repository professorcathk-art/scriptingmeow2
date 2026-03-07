import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreatePostForm } from "@/components/posts/create-post-form";

export default async function CreatePostPage({
  searchParams,
}: {
  searchParams: { edit?: string; styleId?: string; contentIdea?: string; ideaId?: string };
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

  const { data: postIdeas } = await supabase
    .from("user_post_ideas")
    .select("id, content")
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
    if (idea) prefillIdeaContent = idea.content;
  }

  if ((!brandSpaces || brandSpaces.length === 0) && !prefillFromTryStyle) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
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
    <div className="max-w-4xl mx-auto w-full">
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-4 sm:mb-6">Create Instagram Post</h1>
      <CreatePostForm
        brandSpaces={brandSpaces ?? []}
        userCredits={userProfile?.credits_remaining || 0}
        planTier={userProfile?.plan_tier || "free"}
        editPost={editPost}
        libraryPosts={libraryPosts ?? []}
        prefillFromTryStyle={prefillFromTryStyle}
        prefillIdeaContent={prefillIdeaContent}
        postIdeas={postIdeas ?? []}
        skipDraftRestore={!editPost && !prefillFromTryStyle}
      />
    </div>
  );
}
