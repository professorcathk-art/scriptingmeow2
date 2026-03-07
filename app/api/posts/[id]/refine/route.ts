import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateImageWithNanoBanana } from "@/lib/ai/nano-banana";
import { uploadPostImage } from "@/lib/storage";
import { dimensionsToAspectRatio } from "@/lib/dimensions";

export const maxDuration = 120;

const DIMENSION_MAP: Record<string, string> = {
  square: "1:1",
  portrait: "4:5",
  story: "9:16",
  "reel-cover": "9:16",
  "1:1": "1:1",
  "4:5": "4:5",
  "9:16": "9:16",
  "16:9": "16:9",
  "3:4": "3:4",
};

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const comment = (body.comment as string)?.trim();
  const refinedPageIndex = body.refinedPageIndex as number | undefined;

  if (!comment) {
    return NextResponse.json({ error: "comment is required" }, { status: 400 });
  }

  const { data: post, error: postError } = await supabase
    .from("generated_posts")
    .select("id, brand_space_id, post_type, visual_url, carousel_urls, format, custom_width, custom_height")
    .eq("id", params.id)
    .single();

  if (postError || !post) {
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

  const carouselUrls = (post.carousel_urls ?? []) as string[];
  const isCarousel = carouselUrls.length > 0;

  if (isCarousel) {
    const pageIdx = refinedPageIndex != null ? refinedPageIndex : 0;
    if (pageIdx < 0 || pageIdx >= carouselUrls.length) {
      return NextResponse.json(
        { error: "Invalid page index for carousel" },
        { status: 400 }
      );
    }
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("credits_remaining")
    .eq("id", user.id)
    .single();

  const unlimitedCredits = process.env.UNLIMITED_CREDITS_FOR_TESTING === "true";
  if (!unlimitedCredits && (userProfile?.credits_remaining ?? 0) < 1) {
    return NextResponse.json(
      { error: "Not enough credits. 1 credit required per refinement." },
      { status: 402 }
    );
  }

  const format = post.format as string;
  let aspectRatio = DIMENSION_MAP[format] ?? "1:1";
  if (format === "custom" && post.custom_width && post.custom_height) {
    aspectRatio = dimensionsToAspectRatio(
      post.custom_width as number,
      post.custom_height as number
    );
  }

  const imageUrl = isCarousel
    ? carouselUrls[refinedPageIndex ?? 0]
    : (post.visual_url as string);

  if (!imageUrl) {
    return NextResponse.json(
      { error: "No image to refine" },
      { status: 400 }
    );
  }

  const refinePrompt = `Refine this image based on user feedback. Keep the same overall concept and composition, but apply these changes:

User feedback: ${comment}

Generate an improved version that incorporates the feedback while maintaining visual coherence.`;

  try {
    const imageBuffer = await generateImageWithNanoBanana(refinePrompt, {
      aspectRatio,
      referenceImageUrls: [imageUrl],
    });

    if (!imageBuffer) {
      return NextResponse.json(
        { error: "Refinement failed" },
        { status: 500 }
      );
    }

    const pageIndex = isCarousel ? (refinedPageIndex ?? 0) + 1 : undefined;
    const { count: histCount } = await supabase
      .from("post_refinement_history")
      .select("id", { count: "exact", head: true })
      .eq("post_id", post.id);
    const nextVersion = (histCount ?? 0) + 1;
    const versionSuffix = `-refine-${nextVersion}`;
    const newImageUrl = await uploadPostImage(
      imageBuffer,
      post.id,
      user.id,
      pageIndex,
      versionSuffix
    );

    const newCarouselUrls = isCarousel
      ? carouselUrls.map((url, i) =>
          i === (refinedPageIndex ?? 0) ? newImageUrl : url
        )
      : [];

    if (!unlimitedCredits) {
      const newCredits = (userProfile?.credits_remaining ?? 0) - 1;
      await supabase
        .from("users")
        .update({ credits_remaining: newCredits })
        .eq("id", user.id);
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -1,
        description: "Post refinement",
      });
    }

    if (isCarousel) {
      await supabase
        .from("generated_posts")
        .update({ carousel_urls: newCarouselUrls })
        .eq("id", post.id);
    } else {
      await supabase
        .from("generated_posts")
        .update({ visual_url: newImageUrl })
        .eq("id", post.id);
    }

    const prevVisual = isCarousel ? null : (post.visual_url as string);
    const prevCarousel = isCarousel ? (post.carousel_urls as string[]) ?? [] : [];

    await supabase.from("post_refinement_history").insert({
      post_id: post.id,
      version_index: nextVersion - 1,
      previous_visual_url: prevVisual,
      previous_carousel_urls: prevCarousel,
      visual_url: isCarousel ? null : newImageUrl,
      carousel_urls: isCarousel ? newCarouselUrls : [],
      refined_page_index: isCarousel ? refinedPageIndex ?? 0 : null,
      comment,
    });

    return NextResponse.json({
      visual_url: isCarousel ? undefined : newImageUrl,
      carousel_urls: isCarousel ? newCarouselUrls : undefined,
      credits_remaining: unlimitedCredits
        ? userProfile?.credits_remaining
        : (userProfile?.credits_remaining ?? 0) - 1,
    });
  } catch (error) {
    console.error("[posts/refine]", error);
    return NextResponse.json(
      { error: "Refinement failed" },
      { status: 500 }
    );
  }
}
