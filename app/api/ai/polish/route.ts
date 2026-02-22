import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a professional copywriter. Polish and improve the following text for a brand. Keep the same meaning and intent, but make it clearer, more professional, and more compelling. Do not add new information—only refine what's there.

Field: ${fieldLabel || "Brand description"}
Original text:
${text}

Return ONLY the polished text, nothing else. No quotes, no preamble.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const polishedText = response.text().trim();

    return NextResponse.json({ polishedText });
  } catch (error) {
    console.error("Error polishing text:", error);
    return NextResponse.json(
      { error: "Failed to polish text. Please try again." },
      { status: 500 }
    );
  }
}
