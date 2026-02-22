import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { caption, status, tags } = await request.json();

    // Verify ownership
    const { data: post } = await supabase
      .from("generated_posts")
      .select("brand_space_id, brand_spaces!inner(user_id)")
      .eq("id", params.id)
      .single();

    if (!post || (post.brand_spaces as any).user_id !== user.id) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (caption) updateData.caption = caption;
    if (status) updateData.status = status;
    if (tags) updateData.tags = tags;

    const { data, error } = await supabase
      .from("generated_posts")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating post:", error);
      return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PUT /api/posts/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
