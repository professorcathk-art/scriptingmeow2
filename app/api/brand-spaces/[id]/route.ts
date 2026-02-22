import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: brandSpace } = await supabase
      .from("brand_spaces")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!brandSpace) {
      return NextResponse.json({ error: "Brand space not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("brand_spaces")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("Error deleting brand space:", error);
      return NextResponse.json({ error: "Failed to delete brand space" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/brand-spaces/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: brandSpace } = await supabase
      .from("brand_spaces")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single();

    if (!brandSpace) {
      return NextResponse.json({ error: "Brand space not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, brandType, targetAudiences, painPoints, desiredOutcomes, valueProposition } = body;

    const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updatePayload.name = name;
    if (brandType !== undefined) updatePayload.brand_type = brandType;

    const brandDetails: Record<string, string> = {};
    if (targetAudiences !== undefined) brandDetails.targetAudiences = targetAudiences;
    if (painPoints !== undefined) brandDetails.painPoints = painPoints;
    if (desiredOutcomes !== undefined) brandDetails.desiredOutcomes = desiredOutcomes;
    if (valueProposition !== undefined) brandDetails.valueProposition = valueProposition;

    if (Object.keys(brandDetails).length > 0) {
      const { data: existing } = await supabase
        .from("brand_spaces")
        .select("brand_details")
        .eq("id", params.id)
        .single();

      const merged = {
        ...((existing as { brand_details?: Record<string, string> })?.brand_details ?? {}),
        ...brandDetails,
      };
      updatePayload.brand_details = merged;
    }

    const { data, error } = await supabase
      .from("brand_spaces")
      .update(updatePayload)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating brand space:", error);
      return NextResponse.json({ error: "Failed to update brand space" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PATCH /api/brand-spaces/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
