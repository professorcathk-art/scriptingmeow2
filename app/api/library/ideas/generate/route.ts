import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MODEL = "gemini-2.5-flash";

/** Response schema for structured JSON output (avoids malformed JSON from unescaped quotes). */
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    ideas: {
      type: "array",
      items: { type: "string" },
      description: "Exactly 2 post idea strings, each 1-2 sentences",
    },
  },
  required: ["ideas"],
};

function parseIdeasFromText(text: string): string[] {
  const trimmed = text.trim();
  // Strip markdown code blocks
  const stripped = trimmed
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();

  // Try JSON.parse first
  const match = stripped.match(/\{[\s\S]*\}/);
  const jsonStr = match ? match[0] : stripped;
  try {
    const parsed = JSON.parse(jsonStr) as { ideas?: unknown };
    if (Array.isArray(parsed.ideas)) {
      return parsed.ideas
        .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
        .slice(0, 2);
    }
  } catch {
    // Fallback: extract ideas by regex (handles malformed JSON from unescaped quotes)
    const ideas: string[] = [];
    const arrayMatch = stripped.match(/"ideas"\s*:\s*\[([\s\S]*)\]/);
    if (arrayMatch) {
      const inner = arrayMatch[1];
      let depth = 0;
      let current = "";
      let inString = false;
      let escape = false;
      let quoteChar = '"';
      for (let i = 0; i < inner.length; i++) {
        const c = inner[i];
        if (escape) {
          current += c;
          escape = false;
          continue;
        }
        if (c === "\\") {
          escape = true;
          current += c;
          continue;
        }
        if (!inString) {
          if (c === '"' || c === "'") {
            inString = true;
            quoteChar = c;
            current = "";
            continue;
          }
          if (c === "," && depth === 0) {
            current = "";
            continue;
          }
          if (c === "[") depth++;
          if (c === "]") depth--;
          continue;
        }
        if (c === quoteChar) {
          inString = false;
          ideas.push(current.trim());
          current = "";
          continue;
        }
        current += c;
      }
      if (current.trim()) ideas.push(current.trim());
    }
    return ideas.filter((s) => s.length > 0).slice(0, 2);
  }
  return [];
}

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

  const { data: brandbook } = await supabase
    .from("brandbooks")
    .select("brand_personality, tone_of_voice, target_audiences, audience_pain_points, desired_outcomes, value_proposition")
    .eq("brand_space_id", brandSpaceId)
    .single();

  const details = (brandSpace as { brand_details?: Record<string, unknown> }).brand_details;
  const toList = (v: unknown): string[] => {
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string").slice(0, 5);
    if (typeof v === "string") return v.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 5);
    return [];
  };
  const audiences = brandbook?.target_audiences?.length
    ? brandbook.target_audiences.slice(0, 5).join(", ")
    : toList(details?.targetAudiences).join(", ") || "general audience";
  const painPoints = brandbook?.audience_pain_points?.length
    ? brandbook.audience_pain_points.slice(0, 3).join(", ")
    : toList(details?.painPoints).join(", ") || "common challenges";
  const outcomes = brandbook?.desired_outcomes?.length
    ? brandbook.desired_outcomes.slice(0, 3).join(", ")
    : toList(details?.desiredOutcomes).join(", ") || "growth";
  const valueProp = brandbook?.value_proposition || (typeof details?.valueProposition === "string" ? details.valueProposition : "") || "unique value";
  const personality = (brandbook?.brand_personality ?? "").slice(0, 300) || "professional";
  const tone = (brandbook?.tone_of_voice ?? "").slice(0, 150) || "friendly";

  const prompt = `You are an Instagram content strategist. Generate exactly 2 distinct, actionable post ideas for this brand.

Brand: ${brandSpace.name}
Type: ${brandSpace.brand_type}
Personality: ${personality}
Tone: ${tone}
Audiences: ${audiences}
Pain points: ${painPoints}
Desired outcomes: ${outcomes}
Value proposition: ${valueProp}

Each idea must be 1–2 sentences, specific and actionable (e.g. Share a customer success story showing how X solved Y, or Announce a new product feature with a before/after comparison). Avoid using double quotes inside idea text; use single quotes or rephrase if needed.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const url = `${API_BASE}/models/${MODEL}:generateContent`;
  const bodyPayload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
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
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      return NextResponse.json({ error: "No ideas generated" }, { status: 500 });
    }

    const ideas = parseIdeasFromText(text);
    if (ideas.length === 0) {
      return NextResponse.json({ error: "No ideas generated" }, { status: 500 });
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
