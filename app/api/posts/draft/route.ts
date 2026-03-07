import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generatePostLight, type CarouselDraftOutput } from "@/lib/ai/gemini";

export const maxDuration = 60;

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
  const postStyle = (body.postStyle as string) || "immersive-photo";
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
      .select("id")
      .eq("id", brandSpaceId)
      .eq("user_id", user.id)
      .single();

    if (!brandSpace) {
      return NextResponse.json({ error: "Brand space not found" }, { status: 404 });
    }

    const enrichedIdea = referenceText.trim()
      ? `${contentIdea.trim().slice(0, 1200)}\n\n--- Reference (extract key ideas) ---\n${referenceText.trim().slice(0, 3000)}`
      : contentIdea.trim().slice(0, 1200);

    const result = await generatePostLight(
      enrichedIdea,
      language,
      postType,
      format,
      postStyle,
      contentFramework,
      carouselPageCount
    );

    if ("pages" in result) {
      const carousel = result as CarouselDraftOutput;
      return NextResponse.json({
        variations: [{ pages: carousel.pages, igCaption: carousel.igCaption, postAim: carousel.postAim }],
      });
    }

    return NextResponse.json({
      variations: result.map((v) => ({
        imageTextOnImage: v.imageTextOnImage ?? "",
        visualAdvice: v.visualAdvice ?? "",
        igCaption: v.igCaption ?? "",
        postAim: v.postAim ?? "",
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
