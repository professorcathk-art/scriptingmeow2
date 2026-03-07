import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandSpaceId, brandbook } = await request.json();

    // Verify brand space ownership
    const { data: brandSpace } = await supabase
      .from("brand_spaces")
      .select("id")
      .eq("id", brandSpaceId)
      .eq("user_id", user.id)
      .single();

    if (!brandSpace) {
      return NextResponse.json({ error: "Brand space not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("brandbooks")
      .insert({
        ...brandbook,
        brand_space_id: brandSpaceId,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating brandbook:", error);
      return NextResponse.json({ error: "Failed to save brandbook" }, { status: 500 });
    }

    revalidatePath(`/brand-spaces/${brandSpaceId}`);
    revalidatePath(`/brand-spaces/${brandSpaceId}/brandbook`);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in POST /api/brandbooks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandSpaceId, brandbook } = await request.json();

    // Verify brand space ownership
    const { data: brandSpace } = await supabase
      .from("brand_spaces")
      .select("id")
      .eq("id", brandSpaceId)
      .eq("user_id", user.id)
      .single();

    if (!brandSpace) {
      return NextResponse.json({ error: "Brand space not found" }, { status: 404 });
    }

    const { id, ...updateData } = brandbook;

    const { data, error } = await supabase
      .from("brandbooks")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("brand_space_id", brandSpaceId)
      .select()
      .single();

    if (error) {
      console.error("Error updating brandbook:", error);
      return NextResponse.json({ error: "Failed to update brandbook" }, { status: 500 });
    }

    revalidatePath(`/brand-spaces/${brandSpaceId}`);
    revalidatePath(`/brand-spaces/${brandSpaceId}/brandbook`);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in PUT /api/brandbooks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
