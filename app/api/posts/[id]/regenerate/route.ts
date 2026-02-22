import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generatePost } from "@/lib/ai/gemini";
import { generateImageWithNanoBanana } from "@/lib/ai/nano-banana";
import { uploadPostImage, uploadPostPlaceholder } from "@/lib/storage";

export async function POST(
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

    // Get post and verify ownership
    const { data: post } = await supabase
      .from("generated_posts")
      .select("*, brand_spaces!inner(user_id)")
      .eq("id", params.id)
      .single();

    if (!post || (post.brand_spaces as any).user_id !== user.id) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get brandbook
    const { data: brandbook } = await supabase
      .from("brandbooks")
      .select("*")
      .eq("brand_space_id", post.brand_space_id)
      .single();

    if (!brandbook) {
      return NextResponse.json(
        { error: "Brandbook not found" },
        { status: 404 }
      );
    }

    // Regenerate post
    const generatedPost = await generatePost(
      {
        brandPersonality: brandbook.brand_personality,
        toneOfVoice: brandbook.tone_of_voice,
        visualStyle: brandbook.visual_style,
        captionStructure: brandbook.caption_structure,
        dosAndDonts: brandbook.dos_and_donts,
      },
      post.content_idea,
      post.language,
      post.post_type,
      post.format
    );

    // Use Nano Banana-ready prompt from AI, or build from visualDescription + brandbook
    const imagePrompt =
      generatedPost.nanoBananaPrompt?.trim() ||
      (() => {
        const vs = brandbook.visual_style as {
          primaryColor?: string;
          secondaryColor1?: string;
          colors?: string[];
          mood?: string;
          imageStyle?: string;
        } | null;
        const colors = vs?.primaryColor
          ? [vs.primaryColor, vs.secondaryColor1].filter(Boolean).join(", ")
          : vs?.colors?.join(", ") || "";
        const style = vs?.imageStyle || "professional";
        const mood = vs?.mood || "engaging";
        return `${generatedPost.visualDescription}. Style: ${style}. Mood: ${mood}.${colors ? ` Use these exact colors: ${colors}.` : ""} High-quality, Instagram-ready, scroll-stopping visual.`;
      })();

    const aspectRatio =
      post.format === "portrait" ? "4:5" : post.format === "story" || post.format === "reel-cover" ? "9:16" : "1:1";
    const imageBuffer = await generateImageWithNanoBanana(imagePrompt, { aspectRatio });

    let visualUrl: string;
    if (imageBuffer) {
      visualUrl = await uploadPostImage(imageBuffer, params.id, user.id);
    } else {
      visualUrl = await uploadPostPlaceholder(
        generatedPost.visualDescription,
        params.id,
        user.id
      );
    }

    // Update post
    const { data: updatedPost, error } = await supabase
      .from("generated_posts")
      .update({
        caption: generatedPost.caption,
        visual_url: visualUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating post:", error);
      return NextResponse.json({ error: "Failed to regenerate post" }, { status: 500 });
    }

    return NextResponse.json(updatedPost);
  } catch (error) {
    console.error("Error regenerating post:", error);
    return NextResponse.json(
      { error: "Failed to regenerate post" },
      { status: 500 }
    );
  }
}
