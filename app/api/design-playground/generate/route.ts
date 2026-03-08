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
  customHeight?: number,
  customUnit?: "px" | "mm"
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

  const prompt = (body.prompt as string)?.trim();
  const dimension = (body.dimension as string) || "1:1";
  const customDimensionInput = body.customDimension as string | undefined;
  const customUnit = (body.customUnit as "px" | "mm") || "px";
  const brandSpaceId = body.brandSpaceId as string | undefined;
  const referenceImageUrls = (body.referenceImageUrls as string[]) ?? [];
  const threadId = body.threadId as string | undefined;
  const is4KEnabled = Boolean(body.is4KEnabled);

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
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
    customHeight,
    customUnit
  );

  const { data: userProfile } = await supabase
    .from("users")
    .select("credits_remaining, four_k_credits")
    .eq("id", user.id)
    .single();

  const unlimitedCredits = process.env.UNLIMITED_CREDITS_FOR_TESTING === "true";
  const userFourK = (userProfile as { four_k_credits?: number } | null)?.four_k_credits ?? 0;
  if (!unlimitedCredits && (userProfile?.credits_remaining ?? 0) < 1) {
    return NextResponse.json(
      { error: "Not enough credits. 1 credit required per generation." },
      { status: 402 }
    );
  }
  if (!unlimitedCredits && is4KEnabled && userFourK < 1) {
    return NextResponse.json(
      { error: "Not enough 4K upgrade credits. Upgrade your plan to generate in 4K." },
      { status: 402 }
    );
  }

  let fullPrompt = prompt;
  if (brandSpaceId) {
    const { data: brandbook } = await supabase
      .from("brandbooks")
      .select("id, brand_name, visual_style")
      .eq("brand_space_id", brandSpaceId)
      .single();

    if (brandbook?.visual_style) {
      const vs = brandbook.visual_style as {
        imageGenerationPrompt?: string;
        imageStyle?: string;
        colorDescriptionDetailed?: string;
    };
      const stylePart = vs.imageGenerationPrompt || vs.imageStyle || "";
      const colorPart = vs.colorDescriptionDetailed || "";
      if (stylePart || colorPart) {
        fullPrompt = `Brand style: ${stylePart}. ${colorPart ? `Colors: ${colorPart}.` : ""}\n\nUser request: ${prompt}`;
      }
    }
  }

  try {
    const imageBuffer = await generateImageWithNanoBanana(fullPrompt, {
      aspectRatio,
      referenceImageUrls: referenceImageUrls.slice(0, 3),
      is4K: is4KEnabled,
    });

    if (!imageBuffer) {
      return NextResponse.json(
        { error: "Image generation failed" },
        { status: 500 }
      );
    }

    const id = randomUUID();
    const imageUrl = await uploadDesignPlaygroundImage(imageBuffer, user.id, id);

    if (!unlimitedCredits) {
      const newCredits = (userProfile?.credits_remaining ?? 0) - 1;
      await supabase
        .from("users")
        .update({ credits_remaining: newCredits })
        .eq("id", user.id);
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: -1,
        description: "Design playground generation",
      });
    }

    let resolvedThreadId = threadId;
    if (!resolvedThreadId) {
      const { data: newThread } = await supabase
        .from("design_playground_threads")
        .insert({
          user_id: user.id,
          title: prompt.slice(0, 50) + (prompt.length > 50 ? "…" : ""),
          prompt,
          dimension,
          brand_space_id: brandSpaceId || null,
        })
        .select("id")
        .single();
      resolvedThreadId = newThread?.id ?? undefined;
    } else {
      await supabase
        .from("design_playground_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", resolvedThreadId)
        .eq("user_id", user.id);
    }

    if (resolvedThreadId) {
      const { count } = await supabase
        .from("design_playground_items")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", resolvedThreadId);
      const stepIndex = (count ?? 0);

      await supabase.from("design_playground_items").insert({
        thread_id: resolvedThreadId,
        image_url: imageUrl,
        step_index: stepIndex,
        prompt,
      });
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
        image_url: imageUrl,
        source_type: "design_playground",
        source_id: resolvedThreadId ?? id,
        metadata: { prompt: prompt.slice(0, 500), dimension },
      });
    }

    const newCredits = unlimitedCredits
      ? userProfile?.credits_remaining
      : (userProfile?.credits_remaining ?? 0) - 1;
    const newFourK = unlimitedCredits || !is4KEnabled
      ? userFourK
      : userFourK - 1;
    const responsePayload: Record<string, unknown> = {
      imageUrl,
      id,
      threadId: resolvedThreadId,
      credits_remaining: newCredits,
    };
    if (is4KEnabled) {
      responsePayload.four_k_credits = newFourK;
    }
    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("[design-playground/generate]", error);
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
