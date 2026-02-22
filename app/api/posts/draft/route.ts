import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generatePost } from "@/lib/ai/gemini";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandSpaceId, postType, format, language, contentIdea, postStyle } =
      await request.json();

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
        brandPersonality: brandbook.brand_personality,
        toneOfVoice: brandbook.tone_of_voice,
        visualStyle: brandbook.visual_style,
        captionStructure: brandbook.caption_structure,
        dosAndDonts: brandbook.dos_and_donts,
      },
      contentIdea,
      language,
      postType,
      format,
      postStyle,
      true // prefer Gemini Pro for text output
    );

    return NextResponse.json({
      caption: generatedPost.caption,
      visualAdvice: generatedPost.nanoBananaPrompt || generatedPost.visualDescription,
    });
  } catch (error) {
    console.error("Error generating draft:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate draft", details: message },
      { status: 500 }
    );
  }
}
