import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BulkCreateForm } from "@/components/bulk-create/bulk-create-form";

export default async function BulkCreatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: brandSpaces } = await supabase
    .from("brand_spaces")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: templates } = await supabase
    .from("post_templates")
    .select("id, name, brand_space_id, content_framework, post_style, post_type, format, custom_width, custom_height, carousel_page_count, carousel_pages")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: postIdeas } = await supabase
    .from("user_post_ideas")
    .select("id, content")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: userProfile } = await supabase
    .from("users")
    .select("plan_tier, credits_remaining")
    .eq("id", user.id)
    .single();

  const isPaid = userProfile?.plan_tier !== "free";
  const { data: rssIdeas } = isPaid
    ? await supabase
        .from("user_rss_ideas")
        .select("id, content, title")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">AI Bulk Create</h1>
      <p className="text-zinc-400 mb-6">
        Create multiple posts at once by selecting a brand, template, and ideas from your library.
      </p>
      <BulkCreateForm
        brandSpaces={brandSpaces ?? []}
        templates={templates ?? []}
        postIdeas={postIdeas ?? []}
        rssIdeas={rssIdeas ?? []}
        userCredits={userProfile?.credits_remaining ?? 0}
      />
    </div>
  );
}
