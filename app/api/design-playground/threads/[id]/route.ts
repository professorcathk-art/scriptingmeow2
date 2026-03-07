import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Get a single thread with its items. */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: thread, error: threadError } = await supabase
    .from("design_playground_threads")
    .select("id, title, prompt, dimension, brand_space_id, created_at, updated_at")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (threadError || !thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("design_playground_items")
    .select("id, image_url, step_index, prompt, comment, created_at")
    .eq("thread_id", params.id)
    .order("step_index", { ascending: true });

  return NextResponse.json({
    thread,
    items: items ?? [],
  });
}

/** Update thread title. */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
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

  const title = (body.title as string)?.trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("design_playground_threads")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[design-playground/threads]", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/** Delete a thread. */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("design_playground_threads")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[design-playground/threads]", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
