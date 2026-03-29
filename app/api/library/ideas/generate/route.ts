import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { formatBrandDetailsForPrompt } from "@/lib/brand-context";

export const maxDuration = 90;

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-2.5-flash";

type IdeaPayload = {
  summary: string;
  contentFocus: string;
  textOnImage: string;
  arrangement: string;
  visualAdvice: string;
};

function parseIdeasJson(text: string): IdeaPayload[] | null {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  let jsonStr = match ? match[0] : cleaned;
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");
  try {
    const parsed = JSON.parse(jsonStr);
    const raw = Array.isArray(parsed.ideas) ? parsed.ideas : parsed;
    if (!Array.isArray(raw) || raw.length < 1) return null;
    const out: IdeaPayload[] = [];
    for (const item of raw.slice(0, 3)) {
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      out.push({
        summary: String(o.summary ?? "").trim(),
        contentFocus: String(o.contentFocus ?? "").trim(),
        textOnImage: String(o.textOnImage ?? "").trim(),
        arrangement: String(o.arrangement ?? "").trim(),
        visualAdvice: String(o.visualAdvice ?? "").trim(),
      });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

/**
 * POST — Generate 3 on-brand post ideas (structured) for Idea Bank.
 * Body: { brandSpaceId: string }
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { brandSpaceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const brandSpaceId = body.brandSpaceId;
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
  const brandContext = `
Brand name: ${brandSpace.name}
Brand type: ${brandSpace.brand_type === "other" ? String(details.otherBrandType || "other") : brandSpace.brand_type}
${formatBrandDetailsForPrompt(details) || "—"}
`.trim();

  const prompt = `You are an Instagram content director. Generate exactly 3 DISTINCT post ideas for this brand. Each idea must be clearly relevant to the brand info below—do not suggest generic topics that ignore the brand.

${brandContext}

Return valid JSON only (no markdown fences):
{
  "ideas": [
    {
      "summary": "One short line for list display (max 120 chars)",
      "contentFocus": "What the post is about and the main message",
      "textOnImage": "Suggested headline/subhead/body lines for on-image text (plain text, concise)",
      "arrangement": "How text and visuals should be arranged (without naming a fixed IG layout template)",
      "visualAdvice": "Visual direction: mood, subject, color/lighting notes for the image"
    }
  ]
}`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const url = `${API_BASE}/models/${MODEL}:generateContent`;
  const bodyPayload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.85,
      maxOutputTokens: 4096,
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
      signal: AbortSignal.timeout(85000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "No ideas generated" }, { status: 500 });
    }

    const ideas = parseIdeasJson(text);
    if (!ideas || ideas.length === 0) {
      return NextResponse.json({ error: "Could not parse ideas" }, { status: 500 });
    }

    return NextResponse.json({ ideas });
  } catch (err) {
    console.error("[ideas/generate] Error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate ideas", details: msg },
      { status: 500 }
    );
  }
}
