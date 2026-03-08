import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-2.5-flash";

/** Parse plain-text idea. Returns single idea (whole text). Gemini is instructed to keep under 1000 chars. */
function parseIdeaFromText(text: string): string | null {
  const trimmed = text.trim().replace(/^\s*[\d\-•*]+\s*[\.\)]\s*/, "");
  if (trimmed.length < 20 || trimmed.length > 1200) return null;
  return trimmed;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { brandSpaceId?: string; postType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const brandSpaceId = body.brandSpaceId;
  const postType = body.postType === "carousel" ? "carousel" : "single-image";
  if (!brandSpaceId || typeof brandSpaceId !== "string") {
    return NextResponse.json({ error: "brandSpaceId required" }, { status: 400 });
  }

  const { data: brandSpace } = await supabase
    .from("brand_spaces")
    .select("id, name, brand_type, brand_details")
    .eq("id", brandSpaceId)
    .eq("user_id", user.id)
    .single();

  if (!brandSpace) {
    return NextResponse.json({ error: "Brand space not found" }, { status: 404 });
  }

  const details = (brandSpace as { brand_details?: Record<string, unknown> }).brand_details ?? {};
  const toStr = (v: unknown): string => {
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join(", ");
    if (typeof v === "string") return v.split("\n").map((s) => s.trim()).filter(Boolean).join(", ");
    return "";
  };

  const brandContext = `
BRAND INFO (use all fields to inform your idea):
- Brand name: ${brandSpace.name}
- Brand type: ${brandSpace.brand_type === "other" ? String(details.otherBrandType || "other") : brandSpace.brand_type}
- Target audiences: ${toStr(details.targetAudiences) || "—"}
- Audience pain points: ${toStr(details.painPoints) || "—"}
- Desired outcomes: ${toStr(details.desiredOutcomes) || "—"}
- Value proposition: ${String(details.valueProposition ?? "").trim() || "—"}
`.trim();

  const postTypeNote =
    postType === "carousel"
      ? "The user chose CAROUSEL (multi-slide post). Generate an idea suited for a carousel—e.g. a step-by-step guide, list, or multi-point breakdown that works across several slides."
      : "The user chose SINGLE IMAGE post. Generate an idea suited for one image—e.g. a powerful visual, quote, or single-message graphic. Do NOT suggest carousel or multi-slide content.";

  const prompt = `You are an Instagram content strategist. Generate ONE Instagram post idea for this brand.

This will be used as the content brief for creating an Instagram post (image + caption). The idea should be specific and actionable.

${brandContext}

${postTypeNote}

Generate exactly ONE Instagram post idea. Keep it under 1000 characters so it fits our content brief field. It can be 2–4 sentences. Be concrete. No numbering, no bullets, no JSON, no markdown. Just the idea in plain text.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const url = `${API_BASE}/models/${MODEL}:generateContent`;
  const bodyPayload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
      promptFeedback?: { blockReason?: string };
    };
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      const reason = data.promptFeedback?.blockReason ?? candidate?.finishReason ?? "empty";
      console.warn("[ideas/generate] No text in response:", reason);
      return NextResponse.json(
        { error: "No ideas generated", details: String(reason) },
        { status: 500 }
      );
    }

    const idea = parseIdeaFromText(text);
    if (!idea) {
      console.warn("[ideas/generate] Parse yielded no idea. Raw text length:", text.length, "preview:", text.slice(0, 200));
      return NextResponse.json({ error: "No ideas generated" }, { status: 500 });
    }

    return NextResponse.json({ ideas: [idea] });
  } catch (err) {
    console.error("[ideas/generate] Error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate ideas", details: msg },
      { status: 500 }
    );
  }
}
