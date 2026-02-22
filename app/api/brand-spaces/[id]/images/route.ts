import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

    // Verify brand space ownership
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

    const uploadedImages = [];

    for (const file of files) {
      // Convert file to base64 or upload to Supabase Storage
      // For now, we'll use a placeholder approach
      // In production, upload to Supabase Storage:
      /*
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${params.id}/${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('brand-reference-images')
        .upload(filePath, file);
      
      if (uploadError) {
        continue;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('brand-reference-images')
        .getPublicUrl(filePath);
      */

      // Placeholder: store file info
      const imageUrl = URL.createObjectURL(file); // Temporary URL for now
      
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
