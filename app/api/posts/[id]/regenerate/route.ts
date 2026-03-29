import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generatePost } from "@/lib/ai/gemini";
import { generateImageWithNanoBanana } from "@/lib/ai/nano-banana";
import { buildImagePrompt } from "@/lib/ai/build-image-prompt";
import { uploadPostImage, uploadPostPlaceholder } from "@/lib/storage";
import { MAX_IG_CAPTION_CHARS } from "@/lib/constants";
import { mergeLegacyDraftToOverall, normalizeDraftPageRow } from "@/lib/draft-data";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    let body: { draft_data?: { styling?: string; overallDesign?: string; visualAdvice?: string; imageTextOnImage?: string } } = {};
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
      .select("*, brand_spaces!inner(user_id, logo_url, logo_placement, brand_type, brand_details)")
      .eq("id", params.id)
      .single();

    if (!post || (post.brand_spaces as { user_id?: string }).user_id !== user.id) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const brandSpace = post.brand_spaces as {
      logo_url?: string | null;
      logo_placement?: string | null;
      brand_type?: string;
      brand_details?: { otherBrandType?: string };
    };

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
    const storedDraft = post.draft_data as {
      styling?: string;
      overallDesign?: string;
      visualAdvice?: string;
      imageTextOnImage?: string;
      postAim?: string;
    } | null | undefined;
    const draftData = body.draft_data ?? storedDraft;

    let overallDesign: string;
    let styling: string;
    let igCaption: string;

    if (
      draftData &&
      (("overallDesign" in draftData && "styling" in draftData) ||
        ("visualAdvice" in draftData && "imageTextOnImage" in draftData))
    ) {
      const n = normalizeDraftPageRow(draftData as Record<string, unknown>);
      overallDesign = n.overallDesign;
      styling = n.styling;
      if (!overallDesign && (draftData.visualAdvice != null || draftData.imageTextOnImage != null)) {
        overallDesign = mergeLegacyDraftToOverall(
          draftData.visualAdvice ?? "",
          draftData.imageTextOnImage ?? ""
        );
      }
      igCaption = (post.caption as { igCaption?: string })?.igCaption ?? "";
    } else {
      const genResult = await generatePost(
        {
          brandPersonality: brandbook.brand_personality,
          toneOfVoice: brandbook.tone_of_voice,
          visualStyle: brandbook.visual_style,
          dosAndDonts: brandbook.dos_and_donts,
          brandType: brandSpace.brand_type,
          otherBrandType:
            brandSpace.brand_type === "other" ? brandSpace.brand_details?.otherBrandType : undefined,
        },
        post.content_idea,
        post.language,
        post.post_type,
        post.format,
        postStyle,
        false,
        (post as { content_framework?: string }).content_framework
      );
      const generatedPost = Array.isArray(genResult) ? genResult[0] : null;
      if (!generatedPost || "pages" in generatedPost) {
        return NextResponse.json(
          { error: "Regenerate does not support carousel posts" },
          { status: 400 }
        );
      }
      overallDesign = generatedPost.overallDesign ?? "";
      styling = generatedPost.styling?.trim() || "";
      igCaption = (generatedPost.igCaption ?? "").slice(0, MAX_IG_CAPTION_CHARS);
    }

    const stylingResolved =
      styling ||
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
      overallDesign: overallDesign || undefined,
      styling: stylingResolved || undefined,
      postStyle: postStyle?.trim() || undefined,
      logoUrl: brandSpace?.logo_url ?? null,
      logoPlacement: brandSpace?.logo_placement ?? null,
      brandType: brandSpace.brand_type,
      otherBrandType: brandSpace.brand_details?.otherBrandType,
      contentFramework: (post as { content_framework?: string }).content_framework,
      postAim,
      language: post.language || "English",
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
        overallDesign || stylingResolved || "Post image",
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
    if (
      draftData &&
      (("overallDesign" in draftData && "styling" in draftData) ||
        ("visualAdvice" in draftData && "imageTextOnImage" in draftData))
    ) {
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
