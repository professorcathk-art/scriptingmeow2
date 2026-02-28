import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const BUCKET = "brand-reference-images";

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

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file || !file.size) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
    if (!adminClient) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const fileExt = file.name.split(".").pop() || "png";
    const fileName = `${user.id}/${params.id}/logo.${fileExt}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Logo upload failed:", uploadError);
      return NextResponse.json({ error: "Failed to upload logo" }, { status: 500 });
    }

    const { data: urlData } = adminClient.storage.from(BUCKET).getPublicUrl(uploadData.path);
    const logoUrl = urlData.publicUrl;

    const { error: updateError } = await supabase
      .from("brand_spaces")
      .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
      .eq("id", params.id);

    if (updateError) {
      console.error("Failed to update logo_url:", updateError);
      return NextResponse.json({ error: "Failed to save logo" }, { status: 500 });
    }

    return NextResponse.json({ logoUrl });
  } catch (error) {
    console.error("Error uploading logo:", error);
    return NextResponse.json(
      { error: "Failed to upload logo" },
      { status: 500 }
    );
  }
}
