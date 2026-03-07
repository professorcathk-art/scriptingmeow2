import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { canUpload } from "@/lib/storage-quota";
import { PLAN_LIMITS, type PlanTier } from "@/types/database";

const BUCKET = "brand-reference-images";

export async function GET(
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

    const { data: images } = await supabase
      .from("brand_reference_images")
      .select("id, image_url")
      .eq("brand_space_id", params.id)
      .order("uploaded_at", { ascending: false });

    return NextResponse.json({ images: images ?? [] });
  } catch (error) {
    console.error("Error fetching images:", error);
    return NextResponse.json(
      { error: "Failed to fetch images" },
      { status: 500 }
    );
  }
}

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
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("plan_tier")
      .eq("id", user.id)
      .single();

    const planTier = (userProfile?.plan_tier ?? "free") as PlanTier;
    const totalNewBytes = files.reduce((sum, f) => sum + f.size, 0);
    const { allowed, usageBytes, limitBytes } = await canUpload(user.id, planTier, totalNewBytes);
    if (!allowed) {
      const limitMB = PLAN_LIMITS[planTier].storage_mb ?? 20;
      return NextResponse.json(
        { error: `Storage limit reached (${limitMB} MB). Delete some files or upgrade your plan.` },
        { status: 403 }
      );
    }

    const uploadedImages = [];
    const adminClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${user.id}/${params.id}/${Date.now()}-${i}.${fileExt}`;

      let imageUrl: string;

      if (adminClient) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const { data: uploadData, error: uploadError } = await adminClient.storage
          .from(BUCKET)
          .upload(fileName, buffer, {
            contentType: file.type || "image/jpeg",
            upsert: true,
          });

        if (uploadError) {
          console.warn("Storage upload failed:", uploadError.message);
          continue;
        }
        const { data: urlData } = adminClient.storage.from(BUCKET).getPublicUrl(uploadData.path);
        imageUrl = urlData.publicUrl;
      } else {
        continue;
      }

      const { data: imageRecord, error: imageError } = await supabase
        .from("brand_reference_images")
        .insert({
          brand_space_id: params.id,
          image_url: imageUrl,
        })
        .select()
        .single();

      if (!imageError && imageRecord) {
        uploadedImages.push(imageRecord);
      }
    }

    return NextResponse.json({ images: uploadedImages });
  } catch (error) {
    console.error("Error uploading images:", error);
    return NextResponse.json(
      { error: "Failed to upload images" },
      { status: 500 }
    );
  }
}
