import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/library/save-style
 * Saves a landing style image URL to user's References (user_saved_references).
 * imageUrl: full URL of the image (e.g. from landing-samples)
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  let imageUrl = (body.imageUrl || "").trim();
  if (!imageUrl) return NextResponse.json({ error: "imageUrl required" }, { status: 400 });

  if (!imageUrl.startsWith("http")) {
    const base = process.env.NEXT_PUBLIC_APP_URL || "https://designermeow.com";
    imageUrl = imageUrl.startsWith("/") ? `${base}${imageUrl}` : `${base}/${imageUrl}`;
  }

  const { data, error } = await supabase
    .from("user_saved_references")
    .insert({ user_id: user.id, image_url: imageUrl, source: "landing" })
    .select()
    .single();

  if (error) {
    console.error("[library/save-style] error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
  return NextResponse.json(data);
}
