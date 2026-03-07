import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PostReview } from "@/components/posts/post-review";

export default async function PostReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: post } = await supabase
    .from("generated_posts")
    .select("*, brand_spaces(name)")
    .eq("id", params.id)
    .single();

  if (!post) {
    redirect("/create-post");
  }

  // Verify ownership through brand space
  const { data: brandSpace } = await supabase
    .from("brand_spaces")
    .select("id")
    .eq("id", post.brand_space_id)
    .eq("user_id", user.id)
    .single();

  if (!brandSpace) {
    redirect("/create-post");
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("credits_remaining")
    .eq("id", user.id)
    .single();

  return (
    <PostReview
      post={post}
      userCredits={userProfile?.credits_remaining ?? 0}
    />
  );
}
