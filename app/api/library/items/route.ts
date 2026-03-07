import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MY_DESIGN_FOLDER = "My design";

/** Add an image to "My design" folder. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const imageUrl = body.imageUrl as string | undefined;
  const sourceType = (body.sourceType as string) || "design_playground";
  const sourceId = body.sourceId as string | undefined;
  const metadata = (body.metadata as Record<string, unknown>) ?? {};

  if (!imageUrl?.trim()) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  const { data: folder } = await supabase
    .from("library_folders")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", MY_DESIGN_FOLDER)
    .single();

  let folderId = folder?.id;
  if (!folderId) {
    const { data: created } = await supabase
      .from("library_folders")
      .insert({ user_id: user.id, name: MY_DESIGN_FOLDER })
      .select("id")
      .single();
    folderId = created?.id;
  }

  if (!folderId) {
    return NextResponse.json({ error: "Failed to get My design folder" }, { status: 500 });
  }

  const { data: item, error } = await supabase
    .from("library_items")
    .insert({
      folder_id: folderId,
      user_id: user.id,
      image_url: imageUrl.trim(),
      source_type: sourceType,
      source_id: sourceId ?? null,
      metadata,
    })
    .select("id, image_url, created_at")
    .single();

  if (error) {
    console.error("[library/items]", error);
    return NextResponse.json({ error: "Failed to save to library" }, { status: 500 });
  }

  return NextResponse.json({ item });
}
