import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/library/references
 * Returns user's reference images (saved references + brand reference images from their brand spaces).
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: brandSpaces } = await supabase
      .from("brand_spaces")
      .select("id")
      .eq("user_id", user.id);

    const brandSpaceIds = brandSpaces?.map((b) => b.id) ?? [];

    const { data: savedRefs } = await supabase
      .from("user_saved_references")
      .select("id, image_url")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data: brandRefs } =
      brandSpaceIds.length > 0
        ? await supabase
            .from("brand_reference_images")
            .select("id, image_url")
            .in("brand_space_id", brandSpaceIds)
            .order("uploaded_at", { ascending: false })
        : { data: [] };

    const refs = [
      ...(savedRefs ?? []).map((r) => ({ id: `saved-${r.id}`, image_url: r.image_url })),
      ...(brandRefs ?? []).map((r) => ({ id: r.id, image_url: r.image_url })),
    ];

    return NextResponse.json({ references: refs });
  } catch (error) {
    console.error("Error fetching library references:", error);
    return NextResponse.json(
      { error: "Failed to fetch references" },
      { status: 500 }
    );
  }
}
