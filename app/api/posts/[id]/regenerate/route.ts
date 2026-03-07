import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generatePost } from "@/lib/ai/gemini";
import { generateImageWithNanoBanana } from "@/lib/ai/nano-banana";
import { buildImagePrompt } from "@/lib/ai/build-image-prompt";
import { uploadPostImage, uploadPostPlaceholder } from "@/lib/storage";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    let body: { draft_data?: { visualAdvice?: string; imageTextOnImage?: string } } = {};
    try {
      body = await request.json();
    } catch {
      // No body
    }

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
      .select("*, brand_spaces!inner(user_id, logo_url, logo_placement)")
      .eq("id", params.id)
      .single();

    if (!post || (post.brand_spaces as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const brandSpace = post.brand_spaces as { logo_url?: string | null; logo_placement?: string | null };

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

    const postStyle = (post as { post_style?: string }).post_style;
    const storedDraft = post.draft_data as { visualAdvice?: string; imageTextOnImage?: string; postAim?: string } | null | undefined;
    const draftData = body.draft_data ?? storedDraft;

    let visualAdvice: string;
    let imageTextOnImage: string;
    let igCaption: string;

    if (draftData && "visualAdvice" in draftData && "imageTextOnImage" in draftData) {
      visualAdvice = (draftData.visualAdvice ?? "").trim();
      imageTextOnImage = draftData.imageTextOnImage ?? "";
      igCaption = (post.caption as { igCaption?: string })?.igCaption ?? "";
    } else {
      const genResult = await generatePost(
        {
          brandPersonality: brandbook.brand_personality,
          toneOfVoice: brandbook.tone_of_voice,
          visualStyle: brandbook.visual_style,
          dosAndDonts: brandbook.dos_and_donts,
        },
        post.content_idea,
        post.language,
        post.post_type,
        post.format,
        postStyle
      );
      const generatedPost = Array.isArray(genResult) ? genResult[0] : null;
      if (!generatedPost || "pages" in generatedPost) {
        return NextResponse.json(
          { error: "Regenerate does not support carousel posts" },
          { status: 400 }
        );
      }
      visualAdvice = generatedPost.visualAdvice?.trim() || "";
      imageTextOnImage = generatedPost.imageTextOnImage ?? "";
      igCaption = (generatedPost.igCaption ?? "").slice(0, 1000);
    }

    const visualAdviceResolved =
      visualAdvice ||
      (() => {
        const vs = brandbook.visual_style as {
          primaryColor?: string;
          secondaryColor1?: string;
          colors?: string[];
          imageStyle?: string;
        } | null;
        const colors = vs?.primaryColor
          ? [vs.primaryColor, vs.secondaryColor1].filter(Boolean).join(", ")
          : vs?.colors?.join(", ") || "";
        const style = vs?.imageStyle || "professional";
        return `Professional Instagram post. Style: ${style}.${colors ? ` Use these colors: ${colors}.` : ""} High-quality, scroll-stopping visual.`;
      })();

    const postAim = (draftData && "postAim" in draftData && draftData.postAim) ? String(draftData.postAim).trim() : undefined;
    const fullImagePrompt = buildImagePrompt({
      brandbook,
      visualAdvice: visualAdviceResolved,
      imageTextOnImage: imageTextOnImage || undefined,
      postStyle: postStyle || undefined,
      logoUrl: brandSpace?.logo_url ?? null,
      logoPlacement: brandSpace?.logo_placement ?? null,
      postAim,
    });

    const aspectRatio =
      post.format === "portrait" ? "4:5" : post.format === "story" || post.format === "reel-cover" ? "9:16" : "1:1";
    const logoUrlForRef = brandSpace?.logo_url && brandSpace?.logo_placement && brandSpace.logo_placement !== "none"
      ? [brandSpace.logo_url]
      : [];
    const imageBuffer = await generateImageWithNanoBanana(fullImagePrompt, {
      aspectRatio,
      referenceImageUrls: logoUrlForRef,
    });

    let visualUrl: string;
    if (imageBuffer) {
      visualUrl = await uploadPostImage(imageBuffer, params.id, user.id);
    } else {
      visualUrl = await uploadPostPlaceholder(
        visualAdviceResolved || "Post image",
        params.id,
        user.id
      );
    }

    const caption = { igCaption };

    const updatePayload: Record<string, unknown> = {
      caption,
      visual_url: visualUrl,
      updated_at: new Date().toISOString(),
    };
    if (draftData && "visualAdvice" in draftData && "imageTextOnImage" in draftData) {
      updatePayload.draft_data = draftData;
    }
    const { data: updatedPost, error } = await supabase
      .from("generated_posts")
      .update(updatePayload)
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
