import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"] as const;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, fieldLabel } = await request.json();

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

    const prompt = `You are a professional copywriter. Polish and improve the following text for a brand. Keep the same meaning and intent, but make it clearer, more professional, and more compelling. Do not add new information—only refine what's there.

Field: ${fieldLabel || "Brand description"}
Original text:
${text}

Return ONLY the polished text, nothing else. No quotes, no preamble.`;

    let lastError: unknown = null;
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          ],
        });

        const result = await model.generateContent(prompt);
        const response = result.response;

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
    return NextResponse.json(
      { error: message.includes("AI service") ? message : "Failed to polish text. Please try again." },
      { status: 500 }
    );
  }
}
