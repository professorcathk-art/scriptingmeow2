import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { PLAN_LIMITS, type PlanTier } from "@/types/database";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, brandType, brandTypeOther, targetAudiences, painPoints, desiredOutcomes, valueProposition } = body;

    // Check brand space limit
    const { data: userProfile } = await supabase
      .from("users")
      .select("plan_tier")
      .eq("id", user.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: existingSpaces } = await supabase
      .from("brand_spaces")
      .select("id")
      .eq("user_id", user.id);

    const planTier = userProfile.plan_tier as PlanTier;
    const limit = PLAN_LIMITS[planTier].brand_spaces;

    if (existingSpaces && existingSpaces.length >= limit) {
      return NextResponse.json(
        { error: `You've reached your limit of ${limit} Brand Spaces. Please upgrade to create more.` },
        { status: 403 }
      );
    }

    const brandDetails = {
      targetAudiences: targetAudiences || "",
      painPoints: painPoints || "",
      desiredOutcomes: desiredOutcomes || "",
      valueProposition: valueProposition || "",
      ...(brandType === "other" && brandTypeOther ? { otherBrandType: brandTypeOther } : {}),
    };

    const { data: brandSpace, error } = await supabase
      .from("brand_spaces")
      .insert({
        user_id: user.id,
        name,
        brand_type: brandType,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating brand space:", error);
      return NextResponse.json({ error: "Failed to create brand space" }, { status: 500 });
    }

    if (brandSpace && Object.values(brandDetails).some(Boolean)) {
      const { error: updateErr } = await supabase
        .from("brand_spaces")
        .update({ brand_details: brandDetails })
        .eq("id", brandSpace.id);
      if (updateErr) {
        console.warn("Could not persist brand_details (column may not exist):", updateErr.message);
      }
    }

    return NextResponse.json({
      ...brandSpace,
      brandDetails: brandDetails,
    });
  } catch (error) {
    console.error("Error in POST /api/brand-spaces:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
