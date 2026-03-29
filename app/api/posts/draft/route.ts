import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generatePost, generatePostLight, type CarouselDraftOutput } from "@/lib/ai/gemini";
import { augmentIdeaWithSourceImage } from "@/lib/rss-image-extract";
import { formatBrandDetailsForPrompt } from "@/lib/brand-context";
import { MAX_CONTENT_IDEA_CHARS } from "@/lib/constants";
import { defaultPostAimFromBrief } from "@/lib/brand-context";

export const maxDuration = 120;

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
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const brandSpaceId = body.brandSpaceId as string | undefined;
  const postType = (body.postType as string) || "single-image";
  const format = (body.format as string) || "square";
  const language = (body.language as string) || "English";
  const contentIdea = (body.contentIdea as string) || "";
  const referenceText = (body.referenceText as string) || "";
  const postStyle =
    typeof body.postStyle === "string" ? body.postStyle : "";
  const contentFramework = (body.contentFramework as string) || "educational-value";
  const carouselPageCount =
    postType === "carousel" && typeof body.carouselPageCount === "number"
      ? Math.min(9, Math.max(1, body.carouselPageCount))
      : undefined;

  if (!brandSpaceId || typeof brandSpaceId !== "string") {
    return NextResponse.json(
      { error: "brandSpaceId is required" },
      { status: 400 }
    );
  }

  if (!contentIdea.trim()) {
    return NextResponse.json(
      { error: "contentIdea is required" },
      { status: 400 }
    );
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error("[posts/draft] GEMINI_API_KEY not configured");
    return NextResponse.json(
      { error: "AI service not configured", details: "GEMINI_API_KEY is missing" },
      { status: 500 }
    );
  }

  try {
    const { data: brandSpace } = await supabase
      .from("brand_spaces")
      .select("id, brand_type, brand_details")
      .eq("id", brandSpaceId)
      .eq("user_id", user.id)
      .single();

    if (!brandSpace) {
      return NextResponse.json({ error: "Brand space not found" }, { status: 404 });
    }

    const details = (brandSpace as { brand_details?: Record<string, unknown> }).brand_details;
    const brandDetailsBlock = formatBrandDetailsForPrompt(details);
    const otherBrandType =
      typeof details?.otherBrandType === "string" ? details.otherBrandType.trim() : "";

    let enrichedIdea = referenceText.trim()
      ? `${contentIdea.trim().slice(0, MAX_CONTENT_IDEA_CHARS)}\n\n--- Reference (extract key ideas) ---\n${referenceText.trim().slice(0, 3000)}`
      : contentIdea.trim().slice(0, MAX_CONTENT_IDEA_CHARS);

    if (brandDetailsBlock) {
      enrichedIdea = `${enrichedIdea}\n\n--- Brand context (use for postAim and on-brand copy) ---\n${brandDetailsBlock}`;
    }

    enrichedIdea = await augmentIdeaWithSourceImage(enrichedIdea);

    const { data: brandbook } = await supabase
      .from("brandbooks")
      .select("brand_personality, tone_of_voice, visual_style, dos_and_donts")
      .eq("brand_space_id", brandSpaceId)
      .single();

    let result = brandbook
      ? await generatePost(
          {
            brandPersonality: brandbook.brand_personality ?? "",
            toneOfVoice: brandbook.tone_of_voice ?? "",
            visualStyle: brandbook.visual_style ?? {},
            dosAndDonts: brandbook.dos_and_donts ?? {},
            brandType: (brandSpace as { brand_type?: string }).brand_type,
            otherBrandType:
              (brandSpace as { brand_type?: string }).brand_type === "other"
                ? otherBrandType
                : undefined,
          },
          enrichedIdea,
          language,
          postType,
          format,
          postStyle,
          false,
          contentFramework,
          carouselPageCount,
          true // singleSafety: match brandbook (5 attempts not 10), avoid timeout
        )
      : await generatePostLight(
          enrichedIdea,
          language,
          postType,
          format,
          postStyle,
          contentFramework,
          carouselPageCount
        );

    const isFallback = (r: typeof result) =>
      !("pages" in r) &&
      Array.isArray(r) &&
      r.length > 0 &&
      (r[0].visualAdvice?.startsWith("Professional Instagram post image.") ?? false);
    if (brandbook && isFallback(result)) {
      console.warn("[posts/draft] generatePost returned fallback, retrying with generatePostLight");
      result = await generatePostLight(
        enrichedIdea,
        language,
        postType,
        format,
        postStyle,
        contentFramework,
        carouselPageCount
      );
    }

    if ("pages" in result) {
      const carousel = result as CarouselDraftOutput;
      const postAim = carousel.postAim?.trim() || defaultPostAimFromBrief(enrichedIdea);
      return NextResponse.json({
        variations: [{ pages: carousel.pages, igCaption: carousel.igCaption, postAim }],
      });
    }

    return NextResponse.json({
      variations: result.map((v) => ({
        imageTextOnImage: v.imageTextOnImage ?? "",
        visualAdvice: v.visualAdvice ?? "",
        igCaption: v.igCaption ?? "",
        postAim: v.postAim?.trim() || defaultPostAimFromBrief(enrichedIdea),
      })),
    });
  } catch (error) {
    console.error("[posts/draft] Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to generate draft",
        details: message,
      },
      { status: 500 }
    );
  }
}
