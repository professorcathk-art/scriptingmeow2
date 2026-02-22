import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generatePost } from "@/lib/ai/gemini";

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
  const postStyle = (body.postStyle as string) || "immersive-photo";
  const contentFramework = (body.contentFramework as string) || "educational-value";

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

    const generatedPost = await generatePost(
      {
        brandPersonality: brandbook.brand_personality || "",
        toneOfVoice: brandbook.tone_of_voice || "",
        visualStyle: brandbook.visual_style || {},
        captionStructure: brandbook.caption_structure || {},
        dosAndDonts: brandbook.dos_and_donts || {},
      },
      contentIdea,
      language,
      postType,
      format,
      postStyle,
      true, // prefer Gemini Pro for text output
      contentFramework
    );

    return NextResponse.json({
      caption: generatedPost.caption,
      visualAdvice: generatedPost.nanoBananaPrompt || generatedPost.visualDescription,
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
