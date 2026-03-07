import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Get refinement history for a post. */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: post } = await supabase
    .from("generated_posts")
    .select("id, brand_space_id")
    .eq("id", params.id)
    .single();

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: brandSpace } = await supabase
    .from("brand_spaces")
    .select("id")
    .eq("id", post.brand_space_id)
    .eq("user_id", user.id)
    .single();

  if (!brandSpace) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: history } = await supabase
    .from("post_refinement_history")
    .select("id, version_index, previous_visual_url, previous_carousel_urls, visual_url, carousel_urls, refined_page_index, comment, created_at")
    .eq("post_id", params.id)
    .order("version_index", { ascending: true });

  return NextResponse.json({ history: history ?? [] });
}
