import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/templates - List user's post templates
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: templates } = await supabase
      .from("post_templates")
      .select("id, name, brand_space_id, content_framework, post_style, post_type, format, custom_width, custom_height, carousel_page_count, carousel_pages, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    return NextResponse.json({ templates: templates ?? [] });
  } catch (error) {
    console.error("Error fetching templates:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/templates - Create template from post or from scratch
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { postId, name } = body as { postId?: string; name?: string };

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    if (postId) {
      const { data: post } = await supabase
        .from("generated_posts")
        .select("*")
        .eq("id", postId)
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
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      const draftData = post.draft_data as
        | { carouselPages?: Array<{ pageIndex: number; header: string; imageTextOnImage: string; visualAdvice: string }> }
        | null
        | undefined;
      const carouselPages = draftData && "carouselPages" in draftData ? draftData.carouselPages : null;

      const { data: template, error } = await supabase
        .from("post_templates")
        .insert({
          user_id: user.id,
          name: name.trim(),
          brand_space_id: post.brand_space_id,
          content_framework: (post as { content_framework?: string }).content_framework ?? "educational-value",
          post_style: (post as { post_style?: string }).post_style ?? "immersive-photo",
          post_type: post.post_type,
          format: post.format,
          custom_width: (post as { custom_width?: number | null }).custom_width ?? null,
          custom_height: (post as { custom_height?: number | null }).custom_height ?? null,
          carousel_page_count: carouselPages?.length ?? (post as { carousel_page_count?: number | null }).carousel_page_count ?? 3,
          carousel_pages: carouselPages ?? (post as { carousel_pages?: unknown }).carousel_pages ?? null,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ template });
    }

    return NextResponse.json(
      { error: "postId is required to create template from post" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
