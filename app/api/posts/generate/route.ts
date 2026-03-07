import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { generatePost } from "@/lib/ai/gemini";
import { generateImageWithNanoBanana } from "@/lib/ai/nano-banana";
import { buildImagePrompt } from "@/lib/ai/build-image-prompt";
import { uploadPostImage, uploadPostPlaceholder } from "@/lib/storage";

export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch (e) {
    console.error("[posts/generate] Invalid JSON body:", e);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const {
    brandSpaceId,
    postType,
    format,
    customWidth,
    customHeight,
    language,
    contentIdea,
    variations,
    carouselPageCount,
    carouselPages,
    postStyle,
    contentFramework,
    confirmedImageTextOnImage,
    confirmedVisualAdvice,
    confirmedIgCaption,
    confirmedCaption,
    postAim,
    selectedSampleImageUrls,
    referenceImageUrls,
  } = body as {
    brandSpaceId?: string;
    postType?: string;
    format?: string;
    customWidth?: number;
    customHeight?: number;
    language?: string;
    contentIdea?: string;
    variations?: number;
    carouselPageCount?: number;
    carouselPages?: Array<{
      pageIndex: number;
      header: string;
      imageTextOnImage: string;
      visualAdvice: string;
    }>;
    postStyle?: string;
    contentFramework?: string;
    confirmedImageTextOnImage?: string;
    confirmedVisualAdvice?: string;
    confirmedIgCaption?: string;
    confirmedCaption?: { hook: string; body: string; cta: string; hashtags: string[] };
    postAim?: string;
    selectedSampleImageUrls?: string[];
    referenceImageUrls?: string[];
  };

  if (!brandSpaceId) {
    return NextResponse.json(
      { error: "brandSpaceId is required" },
      { status: 400 }
    );
  }

  const isCarousel = postType === "carousel" && Array.isArray(carouselPages) && carouselPages.length > 0;
  const creditsNeeded = isCarousel
    ? carouselPages.length
    : typeof variations === "number"
      ? variations
      : 1;

  try {
    // Verify brand space ownership and get logo, brand type
    const { data: brandSpace } = await supabase
      .from("brand_spaces")
      .select("id, logo_url, logo_placement, brand_type, brand_details")
      .eq("id", brandSpaceId)
      .eq("user_id", user.id)
      .single();

    if (!brandSpace) {
      return NextResponse.json({ error: "Brand space not found" }, { status: 404 });
    }

    // Get brandbook (needed for image prompt fallback when not using confirmed data)
    const { data: brandbook } = await supabase
      .from("brandbooks")
      .select("*")
      .eq("brand_space_id", brandSpaceId)
      .single();

    if (!brandbook) {
      return NextResponse.json(
        { error: "Brandbook not found. Please create a brandbook first." },
        { status: 400 }
      );
    }

    // Use confirmed draft or generate new
    let caption: { igCaption: string } | { hook: string; body: string; cta: string; hashtags: string[] };
    let imagePrompt = "";
    let imageTextOnImage = "";

    const igCaptionFromConfirmed =
      confirmedIgCaption !== undefined
        ? (confirmedIgCaption ?? "").trim()
        : confirmedCaption
          ? [confirmedCaption.hook, confirmedCaption.body, confirmedCaption.cta]
              .filter(Boolean)
              .join("\n\n") +
            (Array.isArray(confirmedCaption.hashtags) && confirmedCaption.hashtags.length
              ? "\n\n" + confirmedCaption.hashtags.join(" ")
              : "")
          : "";

    const hasConfirmedDraft =
      confirmedVisualAdvice !== undefined ||
      confirmedIgCaption !== undefined ||
      (confirmedCaption && (confirmedCaption.hook || confirmedCaption.body || confirmedCaption.cta));

    if (isCarousel) {
      caption = { igCaption: igCaptionFromConfirmed.slice(0, 400) || "Carousel post." };
    } else if (hasConfirmedDraft) {
      caption = { igCaption: igCaptionFromConfirmed.slice(0, 400) };
      imageTextOnImage = (confirmedImageTextOnImage ?? "").trim();
      imagePrompt = (confirmedVisualAdvice ?? "").trim();
    } else {
      const genResult = await generatePost(
        {
          brandPersonality: brandbook.brand_personality,
          toneOfVoice: brandbook.tone_of_voice,
          visualStyle: brandbook.visual_style,
          dosAndDonts: brandbook.dos_and_donts,
        },
        contentIdea || "",
        language || "English",
        postType || "single-image",
        format || "square",
        postStyle,
        false,
        contentFramework
      );
      const generatedPost = Array.isArray(genResult) ? genResult[0] : null;
      if (generatedPost && "imageTextOnImage" in generatedPost) {
        caption = { igCaption: (generatedPost.igCaption ?? "").slice(0, 400) };
        imageTextOnImage = generatedPost.imageTextOnImage ?? "";
        imagePrompt = generatedPost.visualAdvice?.trim() || "";
      } else {
        caption = { igCaption: "" };
        imageTextOnImage = "";
        imagePrompt = "";
      }
    }

    if (!isCarousel && !imagePrompt) {
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
      imagePrompt = `Professional Instagram post. Style: ${style}.${colors ? ` Use these colors: ${colors}.` : ""} High-quality, scroll-stopping visual.`;
    }

    const brandDetails = brandSpace as { brand_details?: { otherBrandType?: string } } | undefined;

    // Check credits
    const { data: userProfile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const unlimitedCredits = process.env.UNLIMITED_CREDITS_FOR_TESTING === "true";
    if (
      !unlimitedCredits &&
      userProfile.credits_remaining < creditsNeeded
    ) {
      return NextResponse.json(
        {
          error: `Not enough credits. You have ${userProfile.credits_remaining} credits, but need ${creditsNeeded}.`,
        },
        { status: 403 }
      );
    }

    const draftData = isCarousel && carouselPages
      ? { carouselPages, postAim: postAim?.trim() || undefined }
      : { visualAdvice: imagePrompt, imageTextOnImage, postAim: postAim?.trim() || undefined };

    const insertPayload: Record<string, unknown> = {
      brand_space_id: brandSpaceId,
      post_type: postType,
      format,
      language,
      content_idea: contentIdea || "",
      visual_url: null,
      carousel_urls: isCarousel ? [] : undefined,
      caption,
      status: "saved",
      credits_used: creditsNeeded,
      draft_data: draftData,
      content_framework: contentFramework ?? "educational-value",
      post_style: postStyle ?? "immersive-photo",
      custom_width: typeof customWidth === "number" ? customWidth : null,
      custom_height: typeof customHeight === "number" ? customHeight : null,
      carousel_page_count: isCarousel && Array.isArray(carouselPages) ? carouselPages.length : null,
      carousel_pages: isCarousel && Array.isArray(carouselPages) ? carouselPages : null,
    };
    const { data: post, error: postError } = await supabase
      .from("generated_posts")
      .insert(insertPayload)
      .select()
      .single();

    if (postError) {
      console.error("[posts/generate] Error creating post:", postError);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    const aspectRatio =
      format === "custom" && typeof customWidth === "number" && typeof customHeight === "number"
        ? `${customWidth}:${customHeight}`
        : format === "portrait"
          ? "4:5"
          : format === "story" || format === "reel-cover"
            ? "9:16"
            : "1:1";
    const sampleUrls = [
      ...(Array.isArray(referenceImageUrls)
        ? referenceImageUrls.slice(0, 3).filter((u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")))
        : []),
      ...(Array.isArray(selectedSampleImageUrls)
        ? selectedSampleImageUrls.slice(0, 5).filter((u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")))
        : []),
    ].slice(0, 5);

    let visualUrl: string;
    let carouselUrls: string[] = [];

    if (isCarousel && carouselPages) {
      for (let i = 0; i < carouselPages.length; i++) {
        const page = carouselPages[i];
        const header = (page.header ?? "").trim();
        const imageText = (page.imageTextOnImage ?? "").trim();
        const combinedText = header
          ? (imageText ? `${header}\n${imageText}` : header)
          : imageText || undefined;
        const fullImagePrompt = buildImagePrompt({
          brandbook,
          visualAdvice: page.visualAdvice?.trim() || `Carousel page ${page.pageIndex}. ${contentIdea || ""}`,
          imageTextOnImage: combinedText,
          postStyle: postStyle || "text-heavy",
          pageIndex: page.pageIndex,
          logoUrl: brandSpace?.logo_url ?? null,
          logoPlacement: (brandSpace as { logo_placement?: string | null })?.logo_placement ?? null,
          brandType: brandSpace?.brand_type,
          otherBrandType: brandDetails?.brand_details?.otherBrandType,
          contentFramework: contentFramework as string | undefined,
          postAim: postAim?.trim(),
        });
        const imageBuffer = await generateImageWithNanoBanana(fullImagePrompt, {
          aspectRatio,
          referenceImageUrls: sampleUrls,
        });
        const pageUrl =
          imageBuffer
            ? await uploadPostImage(imageBuffer, post.id, user.id, page.pageIndex)
            : await uploadPostPlaceholder(
                page.visualAdvice || `Page ${page.pageIndex}`,
                `${post.id}-page-${page.pageIndex}`,
                user.id
              );
        carouselUrls.push(pageUrl);
      }
      visualUrl = carouselUrls[0] ?? "";
      await supabase
        .from("generated_posts")
        .update({ visual_url: visualUrl, carousel_urls: carouselUrls })
        .eq("id", post.id);
    } else {
      const fullImagePrompt = buildImagePrompt({
        brandbook,
        visualAdvice: imagePrompt,
        imageTextOnImage: imageTextOnImage || undefined,
        postStyle: postStyle || undefined,
        logoUrl: brandSpace?.logo_url ?? null,
        logoPlacement: (brandSpace as { logo_placement?: string | null })?.logo_placement ?? null,
        brandType: brandSpace?.brand_type,
        otherBrandType: brandDetails?.brand_details?.otherBrandType,
        contentFramework: contentFramework as string | undefined,
        postAim: postAim?.trim(),
      });
      const imageBuffer = await generateImageWithNanoBanana(fullImagePrompt, {
        aspectRatio,
        referenceImageUrls: sampleUrls,
      });

      if (imageBuffer) {
        visualUrl = await uploadPostImage(imageBuffer, post.id, user.id);
      } else {
        visualUrl = await uploadPostPlaceholder(
          imagePrompt,
          post.id,
          user.id
        );
      }
      await supabase
        .from("generated_posts")
        .update({ visual_url: visualUrl })
        .eq("id", post.id);
    }

    let newCreditsRemaining = userProfile.credits_remaining;
    if (!unlimitedCredits) {
      newCreditsRemaining = userProfile.credits_remaining - creditsNeeded;
      const { error: creditError } = await supabase
        .from("users")
        .update({ credits_remaining: newCreditsRemaining })
        .eq("id", user.id);

      if (creditError) {
        console.error("Error updating credits:", creditError);
      }

      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -creditsNeeded,
        description: `Generated ${creditsNeeded} post variation(s)`,
      });
    }

    revalidatePath("/", "layout");

    return NextResponse.json({
      ...post,
      visual_url: visualUrl,
      carousel_urls: isCarousel ? carouselUrls : undefined,
      credits_remaining: newCreditsRemaining,
    });
  } catch (error) {
    console.error("[posts/generate] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to generate post",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
