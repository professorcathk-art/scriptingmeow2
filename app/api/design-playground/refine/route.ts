import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateImageWithNanoBanana } from "@/lib/ai/nano-banana";
import { uploadDesignPlaygroundImage } from "@/lib/storage";

export const maxDuration = 120;

const DIMENSION_MAP: Record<string, string> = {
  "1:1": "1:1",
  "4:5": "4:5",
  "9:16": "9:16",
  "16:9": "16:9",
  "3:4": "3:4",
};

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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const imageUrl = body.imageUrl as string | undefined;
  const comment = (body.comment as string)?.trim();
  const dimension = (body.dimension as string) || "1:1";

  if (!imageUrl || !comment) {
    return NextResponse.json(
      { error: "imageUrl and comment are required" },
      { status: 400 }
    );
  }

  const aspectRatio = DIMENSION_MAP[dimension] ?? "1:1";

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

    const id = randomUUID();
    const newImageUrl = await uploadDesignPlaygroundImage(imageBuffer, user.id, id);

    if (!unlimitedCredits) {
      const newCredits = (userProfile?.credits_remaining ?? 0) - 1;
      await supabase
        .from("users")
        .update({ credits_remaining: newCredits })
        .eq("id", user.id);
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -1,
        description: "Design playground refinement",
      });
    }

    return NextResponse.json({
      imageUrl: newImageUrl,
      id,
      credits_remaining: unlimitedCredits
        ? userProfile?.credits_remaining
        : (userProfile?.credits_remaining ?? 0) - 1,
    });
  } catch (error) {
    console.error("[design-playground/refine]", error);
    return NextResponse.json(
      { error: "Refinement failed" },
      { status: 500 }
    );
  }
}
