import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const BUCKET = "brand-reference-images";

/**
 * POST /api/brand-spaces/[id]/images-from-urls
 * Adds reference images from URLs (e.g. from Library) to the brand space.
 */
export async function POST(
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

    const { urls } = (await request.json()) as { urls?: string[] };
    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "urls array required" }, { status: 400 });
    }

    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
    if (!adminClient) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const uploadedImages = [];
    for (let i = 0; i < Math.min(urls.length, 10); i++) {
      const url = String(urls[i]).trim();
      if (!url.startsWith("http")) continue;

      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "image/jpeg";
        const ext = contentType.includes("png") ? "png" : "jpg";
        const fileName = `${user.id}/${params.id}/lib-${Date.now()}-${i}.${ext}`;

        const { data: uploadData, error: uploadError } = await adminClient.storage
          .from(BUCKET)
          .upload(fileName, buffer, {
            contentType,
            upsert: true,
          });

        if (uploadError) continue;

        const { data: urlData } = adminClient.storage.from(BUCKET).getPublicUrl(uploadData.path);
        const imageUrl = urlData.publicUrl;

        const { data: imageRecord, error: imageError } = await supabase
          .from("brand_reference_images")
          .insert({ brand_space_id: params.id, image_url: imageUrl })
          .select()
          .single();

        if (!imageError && imageRecord) {
          uploadedImages.push(imageRecord);
        }
      } catch {
        // skip failed URL
      }
    }

    return NextResponse.json({ images: uploadedImages });
  } catch (error) {
    console.error("Error adding images from URLs:", error);
    return NextResponse.json(
      { error: "Failed to add images" },
      { status: 500 }
    );
  }
}
