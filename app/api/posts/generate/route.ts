import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generatePost } from "@/lib/ai/gemini";
import { generateImageWithNanoBanana } from "@/lib/ai/nano-banana";
import { uploadPostImage, uploadPostPlaceholder } from "@/lib/storage";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandSpaceId, postType, format, language, contentIdea, variations } =
      await request.json();

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

    // Get brandbook
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

    // Check credits
    const { data: userProfile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const creditsNeeded = variations;
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

    // Generate post using AI
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
      format
    );

    // Create post record (visual_url set after upload)
    const { data: post, error: postError } = await supabase
      .from("generated_posts")
      .insert({
        brand_space_id: brandSpaceId,
        post_type: postType,
        format,
        language,
        content_idea: contentIdea,
        visual_url: null,
        caption: generatedPost.caption,
        status: "generated",
        credits_used: creditsNeeded,
      })
      .select()
      .single();

    if (postError) {
      console.error("Error creating post:", postError);
      return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
    }

    // Build image prompt with brandbook context for consistent style
    const visualStyle = brandbook.visual_style as { colors?: string[]; mood?: string; imageStyle?: string } | null;
    const styleContext = visualStyle
      ? `Style: ${visualStyle.imageStyle ?? "professional"}. Mood: ${visualStyle.mood ?? "engaging"}.${visualStyle.colors?.length ? ` Color palette: ${visualStyle.colors.join(", ")}.` : ""}`
      : "";
    const imagePrompt = styleContext
      ? `${generatedPost.visualDescription}. ${styleContext} High-quality, Instagram-ready, 1080x1080 square format.`
      : `${generatedPost.visualDescription}. High-quality, Instagram-ready, 1080x1080 square format.`;

    // Generate image with Nano Banana; fall back to SVG placeholder if it fails
    let visualUrl: string;
    const aspectRatio = format === "portrait" ? "4:5" : format === "landscape" ? "16:9" : "1:1";
    const imageBuffer = await generateImageWithNanoBanana(imagePrompt, { aspectRatio });

    if (imageBuffer) {
      visualUrl = await uploadPostImage(imageBuffer, post.id, user.id);
    } else {
      visualUrl = await uploadPostPlaceholder(
        generatedPost.visualDescription,
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
        description: `Generated ${variations} post variation(s)`,
      });
    }

    return NextResponse.json({ ...post, visual_url: visualUrl });
  } catch (error) {
    console.error("Error generating post:", error);
    return NextResponse.json(
      { error: "Failed to generate post" },
      { status: 500 }
    );
  }
}
