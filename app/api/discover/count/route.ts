import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("generated_posts")
      .select("id", { count: "exact", head: true })
      .eq("is_public_gallery", true)
      .eq("status", "saved");
    return NextResponse.json({ count: count ?? 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
