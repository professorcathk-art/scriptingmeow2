import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { generateImageWithNanoBanana } from "@/lib/ai/nano-banana";
import { buildImagePrompt } from "@/lib/ai/build-image-prompt";
import { uploadPostImage, uploadPostPlaceholder } from "@/lib/storage";
import { getLandingStyleById } from "@/lib/landing-styles";

export const maxDuration = 120;

/**
 * Try-style flow: Generate 1 post using a landing style (no brandbook required).
 * Creates "My First Brand" + minimal brandbook if user has no brand spaces.
 * Deducts 1 credit.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { styleId: string; contentIdea: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { styleId, contentIdea } = body;
  if (!styleId || typeof styleId !== "string") {
    return NextResponse.json({ error: "styleId is required" }, { status: 400 });
  }

  const style = getLandingStyleById(styleId);
  if (!style) {
    return NextResponse.json({ error: "Invalid style" }, { status: 400 });
  }

  const idea = (contentIdea || "").trim().slice(0, 400) || "Create an engaging Instagram post";

  try {
    const { data: userProfile } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const unlimitedCredits = process.env.UNLIMITED_CREDITS_FOR_TESTING === "true";
    if (!unlimitedCredits && userProfile.credits_remaining < 1) {
      return NextResponse.json(
        { error: "Not enough credits. Upgrade your plan to continue." },
        { status: 403 }
      );
    }

    let brandSpaceId: string;
    const { data: existingSpaces } = await supabase
      .from("brand_spaces")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (existingSpaces && existingSpaces.length > 0) {
      brandSpaceId = existingSpaces[0].id;
    } else {
      const { data: newSpace, error: spaceErr } = await supabase
        .from("brand_spaces")
        .insert({
          user_id: user.id,
          name: "My First Brand",
          brand_type: "personal-brand",
        })
        .select("id")
        .single();
      if (spaceErr || !newSpace) {
        console.error("[try-style] Failed to create brand space:", spaceErr);
        return NextResponse.json(
          { error: "Failed to create brand space" },
          { status: 500 }
        );
      }
      brandSpaceId = newSpace.id;
    }

    const { data: existingBook } = await supabase
      .from("brandbooks")
      .select("id")
      .eq("brand_space_id", brandSpaceId)
      .single();

    const minimalBrandbook = {
      brand_space_id: brandSpaceId,
      brand_name: "My First Brand",
      brand_type: "personal-brand",
      target_audiences: [],
      audience_pain_points: [],
      desired_outcomes: [],
      value_proposition: idea,
      brand_personality: "Engaging, professional, and authentic",
      tone_of_voice: "Friendly and informative",
      visual_style: {
        imageGenerationPrompt: style.visualAdvice,
        imageStyle: style.category,
        colors: ["#8B5CF6", "#06B6D4", "#EC4899"],
      },
      caption_structure: {
        hook_patterns: [],
        body_patterns: [],
        cta_patterns: [],
        hashtag_style: "",
      },
      dos_and_donts: { dos: [], donts: [] },
    };

    if (!existingBook) {
      const { error: bookErr } = await supabase
        .from("brandbooks")
        .insert(minimalBrandbook);
      if (bookErr) {
        console.error("[try-style] Failed to create brandbook:", bookErr);
        return NextResponse.json(
          { error: "Failed to create brandbook" },
          { status: 500 }
        );
      }
    }

    const { data: brandbook } = await supabase
      .from("brandbooks")
      .select("*")
      .eq("brand_space_id", brandSpaceId)
      .single();

    if (!brandbook) {
      return NextResponse.json(
        { error: "Brandbook not found" },
        { status: 500 }
      );
    }

    const caption = {
      igCaption: `${idea}\n\n#instagram #designermeow`,
    };

    const { data: post, error: postErr } = await supabase
      .from("generated_posts")
      .insert({
        brand_space_id: brandSpaceId,
        post_type: "single-image",
        format: "portrait",
        language: "English",
        content_idea: idea,
        visual_url: null,
        caption,
        status: "generated",
        credits_used: 1,
        draft_data: {
          overallDesign: idea,
          styling: style.visualAdvice,
        },
      })
      .select()
      .single();

    if (postErr || !post) {
      console.error("[try-style] Failed to create post:", postErr);
      return NextResponse.json(
        { error: "Failed to create post" },
        { status: 500 }
      );
    }

    const fullImagePrompt = buildImagePrompt({
      brandbook,
      overallDesign: idea,
      styling: style.visualAdvice,
      postStyle: "editorial",
      logoUrl: null,
      logoPlacement: null,
      contentIdea: idea,
      language: "English",
    });

    const imageBuffer = await generateImageWithNanoBanana(fullImagePrompt, {
      aspectRatio: "4:5",
      referenceImageUrls: [],
    });

    const visualUrl = imageBuffer
      ? await uploadPostImage(imageBuffer, post.id, user.id)
      : await uploadPostPlaceholder(style.visualAdvice, post.id, user.id);

    await supabase
      .from("generated_posts")
      .update({ visual_url: visualUrl })
      .eq("id", post.id);

    if (!unlimitedCredits) {
      const newCredits = userProfile.credits_remaining - 1;
      await supabase
        .from("users")
        .update({ credits_remaining: newCredits })
        .eq("id", user.id);
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -1,
        description: "Try style - 1 post",
      });
    }

    revalidatePath("/", "layout");

    return NextResponse.json({
      ...post,
      visual_url: visualUrl,
      credits_remaining: unlimitedCredits
        ? userProfile.credits_remaining
        : userProfile.credits_remaining - 1,
    });
  } catch (error) {
    console.error("[try-style] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate post",
        details: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
