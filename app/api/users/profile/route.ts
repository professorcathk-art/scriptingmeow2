import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Update current user profile (e.g. instagram_handle). */
export async function PATCH(request: Request) {
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

  const instagramHandle = (body.instagramHandle as string)?.trim();
  const normalized = instagramHandle
    ? instagramHandle.startsWith("@")
      ? instagramHandle
      : `@${instagramHandle}`
    : null;

  const { error } = await supabase
    .from("users")
    .update({
      instagram_handle: normalized,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error("[users/profile]", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, instagram_handle: normalized });
}
