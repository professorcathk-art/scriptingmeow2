import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generatePost } from "@/lib/ai/gemini";
import { generateImageWithNanoBanana } from "@/lib/ai/nano-banana";
import { uploadPostImage, uploadPostPlaceholder } from "@/lib/storage";

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
    language,
    contentIdea,
    variations,
    postStyle,
    contentFramework,
    confirmedCaption,
    confirmedVisualAdvice,
  } = body as {
    brandSpaceId?: string;
    postType?: string;
    format?: string;
    language?: string;
    contentIdea?: string;
    variations?: number;
    postStyle?: string;
    contentFramework?: string;
    confirmedCaption?: { hook: string; body: string; cta: string; hashtags: string[] };
    confirmedVisualAdvice?: string;
  };

  if (!brandSpaceId) {
    return NextResponse.json(
      { error: "brandSpaceId is required" },
      { status: 400 }
    );
  }

  const creditsNeeded = typeof variations === "number" ? variations : 1;

  try {
    // Verify brand space ownership
    const { data: brandSpace } = await supabase
      .from("brand_spaces")
      .select("id")
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
    let caption: { hook: string; body: string; cta: string; hashtags: string[] };
    let imagePrompt: string;

    if (confirmedCaption && confirmedVisualAdvice) {
      caption = confirmedCaption;
      imagePrompt = confirmedVisualAdvice.trim();
    } else {
      const generatedPost = await generatePost(
        {
          brandPersonality: brandbook.brand_personality,
          toneOfVoice: brandbook.tone_of_voice,
          visualStyle: brandbook.visual_style,
          captionStructure: brandbook.caption_structure,
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
      caption = generatedPost.caption;
      imagePrompt =
        generatedPost.nanoBananaPrompt?.trim() ||
        generatedPost.visualDescription ||
        "";
    }

    if (!imagePrompt) {
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
      const mood = vs?.mood || "engaging";
      imagePrompt = `Professional Instagram post. Style: ${style}. Mood: ${mood}.${colors ? ` Use these colors: ${colors}.` : ""} High-quality, scroll-stopping visual.`;
    }

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

    // Create post record (visual_url set after upload)
    const { data: post, error: postError } = await supabase
      .from("generated_posts")
      .insert({
        brand_space_id: brandSpaceId,
        post_type: postType,
        format,
        language,
        content_idea: contentIdea || "",
        visual_url: null,
        caption,
        status: "generated",
        credits_used: creditsNeeded,
      })
      .select()
      .single();

    if (postError) {
      console.error("[posts/generate] Error creating post:", postError);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    // Generate image with Nano Banana; fall back to SVG placeholder if it fails
    let visualUrl: string;
    const aspectRatio =
      format === "portrait" ? "4:5" : format === "story" || format === "reel-cover" ? "9:16" : "1:1";
    const imageBuffer = await generateImageWithNanoBanana(imagePrompt, { aspectRatio });

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

    // Deduct credits (skip when unlimited for testing)
    if (!unlimitedCredits) {
      const { error: creditError } = await supabase
        .from("users")
        .update({
          credits_remaining: userProfile.credits_remaining - creditsNeeded,
        })
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

    return NextResponse.json({ ...post, visual_url: visualUrl });
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
