import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { generateImageWithNanoBanana } from "@/lib/ai/nano-banana";
import { uploadDesignPlaygroundImage } from "@/lib/storage";
import {
  dimensionsToAspectRatio,
  parseDimensionInput,
} from "@/lib/dimensions";

export const maxDuration = 120;

const DIMENSION_MAP: Record<string, string> = {
  "1:1": "1:1",
  "4:5": "4:5",
  "9:16": "9:16",
  "16:9": "16:9",
  "3:4": "3:4",
  "21:9": "21:9",
  "4:3": "4:3",
  "3:2": "3:2",
  "2:3": "2:3",
  "5:4": "5:4",
};

function resolveAspectRatio(
  dimension: string,
  customWidth?: number,
  customHeight?: number
): string {
  if (dimension === "custom" && customWidth != null && customHeight != null) {
    return dimensionsToAspectRatio(customWidth, customHeight);
  }
  return DIMENSION_MAP[dimension] ?? "1:1";
}

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
  const customDimensionInput = body.customDimension as string | undefined;
  const customUnit = (body.customUnit as "px" | "mm") || "px";
  const threadId = body.threadId as string | undefined;

  if (!imageUrl || !comment) {
    return NextResponse.json(
      { error: "imageUrl and comment are required" },
      { status: 400 }
    );
  }

  let customWidth: number | undefined;
  let customHeight: number | undefined;
  if (dimension === "custom" && customDimensionInput) {
    const parsed = parseDimensionInput(customDimensionInput, customUnit);
    if (parsed) {
      customWidth = parsed.width;
      customHeight = parsed.height;
    }
  }

  const aspectRatio = resolveAspectRatio(
    dimension,
    customWidth,
    customHeight
  );

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

    if (threadId) {
      const { count } = await supabase
        .from("design_playground_items")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", threadId);
      const stepIndex = (count ?? 0);

      await supabase.from("design_playground_items").insert({
        thread_id: threadId,
        image_url: newImageUrl,
        step_index: stepIndex,
        comment,
      });

      await supabase
        .from("design_playground_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", threadId)
        .eq("user_id", user.id);
    }

    const { data: folder } = await supabase
      .from("library_folders")
      .select("id")
      .eq("user_id", user.id)
      .eq("name", "My design")
      .single();

    let folderId = folder?.id;
    if (!folderId) {
      const { data: created } = await supabase
        .from("library_folders")
        .insert({ user_id: user.id, name: "My design" })
        .select("id")
        .single();
      folderId = created?.id;
    }

    if (folderId) {
      await supabase.from("library_items").insert({
        folder_id: folderId,
        user_id: user.id,
        image_url: newImageUrl,
        source_type: "design_playground",
        source_id: threadId ?? id,
        metadata: { comment: comment.slice(0, 500) },
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
