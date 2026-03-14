import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateBrandbook } from "@/lib/ai/gemini";

export const maxDuration = 120;

function omit<T extends Record<string, unknown>>(obj: T, key: keyof T): Omit<T, typeof key> {
  const { [key]: _, ...rest } = obj;
  return rest;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandSpaceId, brandDetails } = await request.json();

    // Verify brand space ownership
    const { data: brandSpace, error: brandSpaceError } = await supabase
      .from("brand_spaces")
      .select("*")
      .eq("id", brandSpaceId)
      .eq("user_id", user.id)
      .single();

    if (brandSpaceError || !brandSpace) {
      return NextResponse.json({ error: "Brand space not found" }, { status: 404 });
    }

    // Get reference images
    const { data: referenceImages } = await supabase
      .from("brand_reference_images")
      .select("image_url")
      .eq("brand_space_id", brandSpaceId);

    // Use brand details from request (sessionStorage) or fall back to DB (brand_details column)
    const stored = brandDetails ?? (brandSpace as { brand_details?: Record<string, unknown> }).brand_details;

    function toArray(val: unknown): string[] {
      if (Array.isArray(val)) return val.filter((v) => typeof v === "string" && v.trim());
      if (typeof val === "string") return val.split("\n").map((l) => l.trim()).filter(Boolean);
      return [];
    }

    const brandData = {
      name: brandSpace.name,
      type: brandSpace.brand_type,
      otherBrandType: (brandSpace.brand_type === "other" && typeof stored?.otherBrandType === "string") ? stored.otherBrandType : undefined,
      targetAudiences: toArray(stored?.targetAudiences),
      painPoints: toArray(stored?.painPoints),
      desiredOutcomes: toArray(stored?.desiredOutcomes),
      valueProposition: (typeof stored?.valueProposition === "string" ? stored.valueProposition : "") || "",
      referenceImages: referenceImages?.map((img) => img.image_url) || [],
    };

    const generatedBrandbook = await generateBrandbook(brandData);

    const brandbookPayload = {
      brand_space_id: brandSpaceId,
      brand_name: brandSpace.name,
      brand_type: brandSpace.brand_type,
      target_audiences: brandData.targetAudiences,
      audience_pain_points: brandData.painPoints,
      desired_outcomes: brandData.desiredOutcomes,
      value_proposition: brandData.valueProposition,
      brand_personality: generatedBrandbook.brandPersonality,
      tone_of_voice: generatedBrandbook.toneOfVoice,
      visual_style: generatedBrandbook.visualStyle,
      caption_structure: generatedBrandbook.captionStructure,
      dos_and_donts: generatedBrandbook.dosAndDonts,
    };

    const { data: existing } = await supabase
      .from("brandbooks")
      .select("id")
      .eq("brand_space_id", brandSpaceId)
      .single();

    if (existing) {
      const { data: updated, error: updateErr } = await supabase
        .from("brandbooks")
        .update(omit(brandbookPayload, "brand_space_id"))
        .eq("id", existing.id)
        .select()
        .single();
      if (updateErr) {
        console.error("Error updating brandbook:", updateErr);
        return NextResponse.json(brandbookPayload);
      }
      return NextResponse.json(updated);
    }

    const { data: inserted, error: insertErr } = await supabase
      .from("brandbooks")
      .insert(brandbookPayload)
      .select()
      .single();
    if (insertErr) {
      console.error("Error inserting brandbook:", insertErr);
      return NextResponse.json(brandbookPayload);
    }
    return NextResponse.json(inserted);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error generating brandbook:", error);
    return NextResponse.json(
      {
        error: "Failed to generate brandbook",
        details: process.env.NODE_ENV === "development" ? message : undefined,
      },
      { status: 500 }
    );
  }
}
