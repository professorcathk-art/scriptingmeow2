import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const maxDuration = 60;

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

Each idea must be 1–2 sentences, specific and actionable (e.g. "Share a customer success story showing how X solved Y" or "Announce a new product feature with a before/after comparison").

Return ONLY a valid JSON object, no markdown or code blocks. Example:
{"ideas":["idea1","idea2"]}`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
  });

  try {
    const result = await model.generateContent(prompt);
    let text = result.response.text().trim();
    // Strip markdown code blocks (Gemini often returns ```json\n{...}\n```)
    text = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    const match = text.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : text;
    const parsed = JSON.parse(jsonStr) as { ideas?: string[] };
    const ideas = Array.isArray(parsed.ideas)
      ? parsed.ideas.filter((x) => typeof x === "string" && x.trim()).slice(0, 2)
      : [];

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
