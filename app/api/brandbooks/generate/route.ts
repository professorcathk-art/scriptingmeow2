import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { generateBrandbook } from "@/lib/ai/gemini";

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

    // Use brand details from the form if available
    const brandData = {
      name: brandSpace.name,
      type: brandSpace.brand_type,
      targetAudiences: brandDetails?.targetAudiences
        ? brandDetails.targetAudiences.split("\n").filter((l: string) => l.trim())
        : [],
      painPoints: brandDetails?.painPoints
        ? brandDetails.painPoints.split("\n").filter((l: string) => l.trim())
        : [],
      desiredOutcomes: brandDetails?.desiredOutcomes
        ? brandDetails.desiredOutcomes.split("\n").filter((l: string) => l.trim())
        : [],
      valueProposition: brandDetails?.valueProposition || "",
      referenceImages: referenceImages?.map((img) => img.image_url) || [],
    };

    const generatedBrandbook = await generateBrandbook(brandData);

    // Create brandbook structure
    const brandbook = {
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

    return NextResponse.json(brandbook);
  } catch (error) {
    console.error("Error generating brandbook:", error);
    return NextResponse.json(
      { error: "Failed to generate brandbook" },
      { status: 500 }
    );
  }
}
