import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { generateContentV1Beta, isV1BetaModel, safetyToV1Beta } from "@/lib/ai/gemini";

export const maxDuration = 60;

const GEMINI_MODELS = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-pro-preview", "gemini-3-pro-preview"] as const;

const DEFAULT_SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
] as const;

type GenerateContentResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, fieldLabel, context } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const contextBlock =
      context && typeof context === "object"
        ? `
Brand context (use to inform the polish):
${context.accountPositioning ? `- Account positioning: ${context.accountPositioning}` : ""}
${context.targetAudiences ? `- Target audiences: ${context.targetAudiences}` : ""}
${context.painPoints ? `- Audience pain points: ${context.painPoints}` : ""}
${context.contentPillars ? `- Content pillars: ${context.contentPillars}` : ""}
${context.valueProposition ? `- Value proposition: ${context.valueProposition}` : ""}
`
        : "";

    const prompt = `You are an expert IG content strategist and brand copywriter. Polish and improve the following text for an Instagram-focused brand.

Field: ${fieldLabel || "Brand description"}
Original text:
${text}
${contextBlock}

Guidelines:
- Keep the same meaning and intent. Do not add new information—only refine.
- Make it clearer, more compelling, and Instagram-appropriate.
- For target audiences: be specific (age, situation, goals). Avoid vague terms.
- For pain points: focus on emotional and practical struggles the audience faces.
- For value proposition: lead with benefit, be concise and memorable.
- Use language that resonates with the target audience.

Return ONLY the polished text, nothing else. No quotes, no preamble.`;

    let lastError: unknown = null;
    for (const modelName of GEMINI_MODELS) {
      try {
        let response: GenerateContentResponse;
        if (isV1BetaModel(modelName)) {
          response = await generateContentV1Beta(modelName, [{ text: prompt }], {
            temperature: 1.0,
            maxOutputTokens: 1024,
            thinkingLevel: "low",
            safetySettings: safetyToV1Beta(DEFAULT_SAFETY),
          });
        } else {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
            safetySettings: [...DEFAULT_SAFETY],
          });
          const result = await model.generateContent(prompt);
          response = result.response;
        }

        if (!response.candidates || response.candidates.length === 0) {
          const blockReason = response.promptFeedback?.blockReason || "No candidates returned";
          console.warn(`[polish] Model ${modelName}: ${blockReason}`);
          lastError = new Error(blockReason);
          continue;
        }

        const candidate = response.candidates[0];
        if (!candidate.content?.parts?.length) {
          const finishReason = candidate.finishReason || "Empty response";
          console.warn(`[polish] Model ${modelName}: ${finishReason}`);
          lastError = new Error(String(finishReason));
          continue;
        }

        const part = candidate.content.parts[0];
        const polishedText = (part.text || "").trim();
        if (polishedText) {
          return NextResponse.json({ polishedText });
        }
      } catch (modelError) {
        console.warn(`[polish] Model ${modelName} failed:`, modelError);
        lastError = modelError;
      }
    }

    throw lastError ?? new Error("All models failed");
  } catch (error) {
    console.error("Error polishing text:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    let userMessage = "Failed to polish text. Please try again.";
    if (message.includes("leaked") || message.includes("403")) {
      userMessage = "API key invalid or revoked. Please create a new key at aistudio.google.com/apikey and update GEMINI_API_KEY in Vercel.";
    } else if (message.includes("404") || message.includes("not found")) {
      userMessage = "AI model unavailable. Please check your API key and try again.";
    } else if (message.includes("AI service")) {
      userMessage = message;
    }
    return NextResponse.json({ error: userMessage }, { status: 500 });
  }
}
