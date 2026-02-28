import { NextResponse } from "next/server";
import { generatePost } from "@/lib/ai/gemini";

// Demo post generation - no auth required for zero-friction landing
export async function POST(request: Request) {
  try {
    const { brandDescription } = await request.json();

    if (!brandDescription || typeof brandDescription !== "string") {
      return NextResponse.json(
        { error: "Brand description is required" },
        { status: 400 }
      );
    }

    const trimmed = brandDescription.trim();
    if (trimmed.length < 10) {
      return NextResponse.json(
        { error: "Please provide a more detailed brand description" },
        { status: 400 }
      );
    }

    // Create minimal brandbook from the description for demo
    const demoBrandbook = {
      brandPersonality: `A brand that embodies: ${trimmed}`,
      toneOfVoice: "Professional, engaging, and authentic",
      visualStyle: {
        colors: ["#8B5CF6", "#06B6D4", "#EC4899"],
        imageStyle: "Clean, high-quality visuals with a premium feel",
        layoutTendencies: "Balanced composition with clear focal points",
      },
      dosAndDonts: {
        dos: ["Stay on brand", "Use high-quality visuals", "Engage with audience"],
        donts: ["Over-promote", "Use generic stock photos", "Ignore comments"],
      },
    };

    const result = await generatePost(
      demoBrandbook,
      `Create an engaging Instagram post that introduces this brand: ${trimmed}`,
      "English",
      "single-image",
      "square"
    );
    const generatedPost = Array.isArray(result) ? result[0] : null;
    if (!generatedPost || "pages" in generatedPost) {
      throw new Error("Failed to generate demo draft");
    }

    return NextResponse.json({
      caption: { igCaption: generatedPost.igCaption },
      imageTextOnImage: generatedPost.imageTextOnImage,
      visualDescription: generatedPost.visualAdvice,
      nanoBananaPrompt: generatedPost.visualAdvice,
      brandDescription: trimmed,
    });
  } catch (error) {
    console.error("Demo generate error:", error);
    return NextResponse.json(
      { error: "Failed to generate demo post. Please try again." },
      { status: 500 }
    );
  }
}
