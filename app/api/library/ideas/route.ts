import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const brandSpaceId = searchParams.get("brandSpaceId");

  let query = supabase
    .from("user_post_ideas")
    .select("id, content, created_at, brand_space_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (brandSpaceId) {
    query = query.eq("brand_space_id", brandSpaceId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[library/ideas] GET error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
  return NextResponse.json({ ideas: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const content = (body.content || "").trim().slice(0, 4000);
  const brandSpaceId = body.brandSpaceId as string | undefined;

  if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });
  if (!brandSpaceId || typeof brandSpaceId !== "string") {
    return NextResponse.json({ error: "brandSpaceId is required" }, { status: 400 });
  }

  const { data: brandOk } = await supabase
    .from("brand_spaces")
    .select("id")
    .eq("id", brandSpaceId)
    .eq("user_id", user.id)
    .single();

  if (!brandOk) {
    return NextResponse.json({ error: "Brand space not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("user_post_ideas")
    .insert({ user_id: user.id, content, brand_space_id: brandSpaceId })
    .select("id, content, created_at, brand_space_id")
    .single();

  if (error) {
    console.error("[library/ideas] POST error:", error);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
  return NextResponse.json(data);
}
