import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getLandingStyleById } from "@/lib/landing-styles";
import { generateContentV1Beta, isV1BetaModel, safetyToV1Beta } from "@/lib/ai/gemini";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] as const;
const DEFAULT_SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
] as const;

type GenerateContentResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

/**
 * Polishes the base visual prompt to incorporate the user's content idea.
 * Returns a customized image generation prompt.
 */
async function polishVisualAdvice(
  baseVisualAdvice: string,
  contentIdea: string
): Promise<string> {
  if (!contentIdea.trim()) return baseVisualAdvice;

  const prompt = `You are an expert Instagram visual designer. Adapt the following base visual style prompt to incorporate the user's specific content idea. Keep the same aesthetic, layout rules, and quality level. Replace or adapt the subject matter and specific details to match the user's idea. Do NOT add new information beyond what the user described. Return ONLY the adapted prompt, no preamble or explanation.

Base visual style prompt:
${baseVisualAdvice.slice(0, 4000)}

User's content idea:
${contentIdea.slice(0, 500)}

Return the full adapted prompt that preserves the style but reflects the user's content.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return baseVisualAdvice;

  const genAI = new GoogleGenerativeAI(apiKey);

  for (const modelName of GEMINI_MODELS) {
    try {
      let response: GenerateContentResponse;
      if (isV1BetaModel(modelName)) {
        response = await generateContentV1Beta(modelName, [{ text: prompt }], {
          temperature: 0.7,
          maxOutputTokens: 4096,
          thinkingLevel: "low",
          safetySettings: safetyToV1Beta(DEFAULT_SAFETY),
        });
      } else {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          safetySettings: [...DEFAULT_SAFETY],
        });
        const result = await model.generateContent(prompt);
        response = result.response;
      }
      const text = response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text && text.length > 100) return text;
    } catch (e) {
      console.warn(`[try-style-setup] polish failed for ${modelName}:`, e);
    }
  }
  return baseVisualAdvice;
}

/**
 * POST /api/try-style-setup
 * Creates "My First Brand" + brandbook with polished visual advice.
 * Returns { brandSpaceId, polishedVisualAdvice } for use in create-post prefill.
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
        console.error("[try-style-setup] Failed to create brand space:", spaceErr);
        return NextResponse.json(
          { error: "Failed to create brand space" },
          { status: 500 }
        );
      }
      brandSpaceId = newSpace.id;
    }

    const polishedVisualAdvice = await polishVisualAdvice(style.visualAdvice, idea);

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
        imageGenerationPrompt: polishedVisualAdvice,
        image_style: style.category,
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
        console.error("[try-style-setup] Failed to create brandbook:", bookErr);
        return NextResponse.json(
          { error: "Failed to create brandbook" },
          { status: 500 }
        );
      }
    } else {
      const { error: updateErr } = await supabase
        .from("brandbooks")
        .update({
          visual_style: minimalBrandbook.visual_style,
          value_proposition: idea,
          updated_at: new Date().toISOString(),
        })
        .eq("brand_space_id", brandSpaceId);
      if (updateErr) {
        console.error("[try-style-setup] Failed to update brandbook:", updateErr);
      }
    }

    return NextResponse.json({
      brandSpaceId,
      polishedVisualAdvice,
    });
  } catch (error) {
    console.error("[try-style-setup] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to setup",
        details: process.env.NODE_ENV === "development" && error instanceof Error ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
