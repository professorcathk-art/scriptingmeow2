import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { generatePostLight, type CarouselPageDraft } from "@/lib/ai/gemini";
import { normalizeCarouselDraftPage } from "@/lib/draft-data";
import { augmentIdeaWithSourceImage, stripSourceImageUrlFromContent } from "@/lib/rss-image-extract";
import { generateImageWithNanoBanana } from "@/lib/ai/nano-banana";
import { buildImagePrompt } from "@/lib/ai/build-image-prompt";
import { uploadPostImage, uploadPostPlaceholder } from "@/lib/storage";
import { MAX_IG_CAPTION_CHARS } from "@/lib/constants";

export const maxDuration = 600;

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
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { templateId, ideaIds = [], rssIdeaIds = [], useRealImagesFromWeb = true } = body as {
    templateId?: string;
    ideaIds?: string[];
    rssIdeaIds?: string[];
    useRealImagesFromWeb?: boolean;
  };

  if (!templateId || !Array.isArray(ideaIds) || !Array.isArray(rssIdeaIds)) {
    return NextResponse.json(
      { error: "templateId, ideaIds, and rssIdeaIds required" },
      { status: 400 }
    );
  }

  const { data: template } = await supabase
    .from("post_templates")
    .select("*")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .single();

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const brandSpaceId = template.brand_space_id;
  const { data: brandSpace } = await supabase
    .from("brand_spaces")
    .select("id, logo_url, logo_placement, brand_type, brand_details")
    .eq("id", brandSpaceId)
    .eq("user_id", user.id)
    .single();

  if (!brandSpace) {
    return NextResponse.json({ error: "Brand space not found" }, { status: 404 });
  }

  const { data: brandbook } = await supabase
    .from("brandbooks")
    .select("*")
    .eq("brand_space_id", brandSpaceId)
    .single();

  if (!brandbook) {
    return NextResponse.json(
      { error: "Brandbook not found. Create a brandbook first." },
      { status: 400 }
    );
  }

  const ideas: { content: string }[] = [];
  if (ideaIds.length > 0) {
    const { data: rows } = await supabase
      .from("user_post_ideas")
      .select("content")
      .eq("user_id", user.id)
      .in("id", ideaIds);
    if (rows) ideas.push(...rows.map((r) => ({ content: r.content })));
  }
  if (rssIdeaIds.length > 0) {
    const { data: rows } = await supabase
      .from("user_rss_ideas")
      .select("content")
      .eq("user_id", user.id)
      .in("id", rssIdeaIds);
    if (rows) ideas.push(...rows.map((r) => ({ content: r.content })));
  }

  if (ideas.length === 0) {
    return NextResponse.json({ error: "No valid ideas selected" }, { status: 400 });
  }

  const postType = template.post_type || "single-image";
  const format = template.format || "square";
  const customWidth = template.custom_width;
  const customHeight = template.custom_height;
  const isCarousel = postType === "carousel";
  const carouselPageCount = template.carousel_page_count ?? template.carousel_pages?.length ?? 3;
  const postStyle = template.post_style ?? "immersive-photo";
  const contentFramework = template.content_framework ?? "educational-value";

  const creditsPerPost = isCarousel ? carouselPageCount : 1;
  const totalCreditsNeeded = ideas.length * creditsPerPost;

  const { data: userProfile } = await supabase
    .from("users")
    .select("credits_remaining")
    .eq("id", user.id)
    .single();

  const unlimitedCredits = process.env.UNLIMITED_CREDITS_FOR_TESTING === "true";
  if (!unlimitedCredits && (userProfile?.credits_remaining ?? 0) < totalCreditsNeeded) {
    return NextResponse.json(
      {
        error: `Not enough credits. Need ${totalCreditsNeeded} (${creditsPerPost} per post), have ${userProfile?.credits_remaining ?? 0}.`,
      },
      { status: 403 }
    );
  }

  const aspectRatio =
    format === "custom" && typeof customWidth === "number" && typeof customHeight === "number"
      ? `${customWidth}:${customHeight}`
      : format === "portrait"
        ? "4:5"
        : format === "story" || format === "reel-cover"
          ? "9:16"
          : "1:1";

  const brandDetails = brandSpace as { brand_details?: { otherBrandType?: string } };
  const created: string[] = [];
  let failed = 0;
  let creditsDeducted = 0;

  for (const idea of ideas) {
    try {
      let contentForDraft = idea.content;
      if (useRealImagesFromWeb) {
        contentForDraft = await augmentIdeaWithSourceImage(idea.content);
      } else {
        contentForDraft = stripSourceImageUrlFromContent(idea.content);
      }
      const draftResult = await generatePostLight(
        contentForDraft,
        "English",
        postType,
        format,
        postStyle,
        contentFramework,
        isCarousel ? carouselPageCount : undefined
      );

      let caption: { igCaption: string };
      let draftData:
        | { carouselPages?: CarouselPageDraft[] }
        | { overallDesign: string; styling: string };
      let styling = "";
      let overallDesign = "";
      let carouselPages: CarouselPageDraft[] | undefined;

      if (isCarousel && draftResult && "pages" in draftResult) {
        carouselPages = draftResult.pages;
        caption = { igCaption: (draftResult.igCaption ?? "").slice(0, MAX_IG_CAPTION_CHARS) };
        draftData = { carouselPages };
      } else {
        const single = Array.isArray(draftResult) ? draftResult[0] : null;
        styling = single?.styling?.trim() || "";
        overallDesign = single?.overallDesign ?? "";
        caption = { igCaption: (single?.igCaption ?? "").slice(0, MAX_IG_CAPTION_CHARS) };
        draftData = { overallDesign, styling };
      }

      if (!isCarousel && !styling && !overallDesign) {
        const vs = brandbook.visual_style as { primaryColor?: string; colors?: string[]; imageStyle?: string } | null;
        styling = `Professional Instagram post. Style: ${vs?.imageStyle || "professional"}. High-quality visual.`;
      }

      const insertPayload: Record<string, unknown> = {
        brand_space_id: brandSpaceId,
        post_type: postType,
        format,
        language: "English",
        content_idea: contentForDraft,
        visual_url: null,
        carousel_urls: isCarousel ? [] : undefined,
        caption,
        status: "saved",
        credits_used: creditsPerPost,
        draft_data: draftData,
        content_framework: contentFramework,
        post_style: postStyle,
        custom_width: customWidth ?? null,
        custom_height: customHeight ?? null,
        carousel_page_count: isCarousel && carouselPages ? carouselPages.length : null,
        carousel_pages: isCarousel && carouselPages ? carouselPages : null,
      };

      const { data: post, error: postError } = await supabase
        .from("generated_posts")
        .insert(insertPayload)
        .select()
        .single();

      if (postError || !post) {
        failed++;
        continue;
      }

      let visualUrl: string;
      const carouselUrls: string[] = [];

      if (isCarousel && carouselPages) {
        for (let i = 0; i < carouselPages.length; i++) {
          const page = normalizeCarouselDraftPage(carouselPages[i] as Record<string, unknown>);
          const fullImagePrompt = buildImagePrompt({
            brandbook,
            overallDesign: page.overallDesign?.trim() || `Carousel page ${page.pageIndex}. ${idea.content}`,
            styling: page.styling?.trim() || undefined,
            postStyle: postStyle?.trim() || undefined,
            pageIndex: page.pageIndex,
            carouselPageCount: carouselPages.length,
            logoUrl: brandSpace?.logo_url ?? null,
            logoPlacement: (brandSpace as { logo_placement?: string | null })?.logo_placement ?? null,
            brandType: brandSpace?.brand_type,
            otherBrandType: brandDetails.brand_details?.otherBrandType,
            contentFramework,
            language: "English",
          });
          const logoUrlForRef = brandSpace?.logo_url && (brandSpace as { logo_placement?: string | null })?.logo_placement && (brandSpace as { logo_placement?: string }).logo_placement !== "none"
            ? [brandSpace.logo_url]
            : [];
          const imageBuffer = await generateImageWithNanoBanana(fullImagePrompt, {
            aspectRatio,
            referenceImageUrls: logoUrlForRef,
          });
          const pageUrl = imageBuffer
            ? await uploadPostImage(imageBuffer, post.id, user.id, page.pageIndex)
            : await uploadPostPlaceholder(
                page.styling || page.overallDesign || `Page ${page.pageIndex}`,
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
          overallDesign: overallDesign || undefined,
          styling: styling || undefined,
          postStyle: postStyle?.trim() || undefined,
          logoUrl: brandSpace?.logo_url ?? null,
          logoPlacement: (brandSpace as { logo_placement?: string | null })?.logo_placement ?? null,
          brandType: brandSpace?.brand_type,
          otherBrandType: brandDetails.brand_details?.otherBrandType,
          contentFramework,
          language: "English",
        });
        const logoUrlForRef = brandSpace?.logo_url && (brandSpace as { logo_placement?: string | null })?.logo_placement && (brandSpace as { logo_placement?: string }).logo_placement !== "none"
          ? [brandSpace.logo_url]
          : [];
        const imageBuffer = await generateImageWithNanoBanana(fullImagePrompt, {
          aspectRatio,
          referenceImageUrls: logoUrlForRef,
        });
        visualUrl = imageBuffer
          ? await uploadPostImage(imageBuffer, post.id, user.id)
          : await uploadPostPlaceholder(styling || overallDesign || "Post", post.id, user.id);
        await supabase.from("generated_posts").update({ visual_url: visualUrl }).eq("id", post.id);
      }

      created.push(post.id);
      creditsDeducted += creditsPerPost;
    } catch (err) {
      console.error("[bulk-generate] Error for idea:", err);
      failed++;
    }
  }

  let newCreditsRemaining = userProfile?.credits_remaining ?? 0;
  if (!unlimitedCredits && creditsDeducted > 0) {
    newCreditsRemaining = (userProfile?.credits_remaining ?? 0) - creditsDeducted;
    await supabase.from("users").update({ credits_remaining: newCreditsRemaining }).eq("id", user.id);
    await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: -creditsDeducted,
      description: `Bulk: generated ${created.length} post(s)`,
    });
  }

  revalidatePath("/", "layout");

  return NextResponse.json({
    created,
    failed,
    credits_remaining: newCreditsRemaining,
  });
}
