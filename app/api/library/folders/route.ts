import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const MY_DESIGN_FOLDER = "My design";

/** Get or create "My design" folder for the current user. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing } = await supabase
    .from("library_folders")
    .select("id, name")
    .eq("user_id", user.id)
    .eq("name", MY_DESIGN_FOLDER)
    .single();

  if (existing) {
    return NextResponse.json({ folder: existing });
  }

  const { data: created, error } = await supabase
    .from("library_folders")
    .insert({ user_id: user.id, name: MY_DESIGN_FOLDER })
    .select("id, name")
    .single();

  if (error) {
    console.error("[library/folders]", error);
    return NextResponse.json({ error: "Failed to create folder" }, { status: 500 });
  }

  return NextResponse.json({ folder: created });
}
