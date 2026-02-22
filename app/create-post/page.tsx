import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreatePostForm } from "@/components/posts/create-post-form";

export default async function CreatePostPage() {
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

  if (!brandSpaces || brandSpaces.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Create Your First Brand Space
        </h1>
        <p className="text-gray-600 mb-6">
          You need to create a Brand Space before generating posts.
        </p>
        <a
          href="/brand-spaces/new"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create Brand Space
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Instagram Post</h1>
      <CreatePostForm
        brandSpaces={brandSpaces}
        userCredits={userProfile?.credits_remaining || 0}
        planTier={userProfile?.plan_tier || "free"}
      />
    </div>
  );
}
