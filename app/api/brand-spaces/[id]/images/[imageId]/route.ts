import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * DELETE /api/brand-spaces/[id]/images/[imageId] - Remove a reference image
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; imageId: string } }
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
      .from("brand_reference_images")
      .delete()
      .eq("id", params.imageId)
      .eq("brand_space_id", params.id);

    if (error) {
      console.error("Error deleting reference image:", error);
      return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/brand-spaces/[id]/images/[imageId]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
