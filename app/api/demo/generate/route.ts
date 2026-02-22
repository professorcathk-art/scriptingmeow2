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
        mood: "Modern and aspirational",
        imageStyle: "Clean, high-quality visuals with a premium feel",
        layoutTendencies: "Balanced composition with clear focal points",
      },
      captionStructure: {
        hookPatterns: ["Question-based", "Bold statement", "Story opening"],
        bodyPatterns: ["Value-driven", "Educational", "Inspirational"],
        ctaPatterns: ["Soft CTA", "Link in bio", "Comment below"],
        hashtagStyle: "Mix of niche and broad hashtags, 5-10 per post",
      },
      dosAndDonts: {
        dos: ["Stay on brand", "Use high-quality visuals", "Engage with audience"],
        donts: ["Over-promote", "Use generic stock photos", "Ignore comments"],
      },
    };

    const generatedPost = await generatePost(
      demoBrandbook,
      `Create an engaging Instagram post that introduces this brand: ${trimmed}`,
      "English",
      "single-image",
      "square"
    );

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
