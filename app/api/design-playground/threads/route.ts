import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** List design playground threads for the current user. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: threads, error } = await supabase
    .from("design_playground_threads")
    .select("id, title, prompt, dimension, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[design-playground/threads]", error);
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }

  const threadIds = (threads ?? []).map((t) => t.id);
  if (threadIds.length === 0) {
    return NextResponse.json({ threads: [] });
  }

  const { data: latestItems } = await supabase
    .from("design_playground_items")
    .select("thread_id, image_url, step_index")
    .in("thread_id", threadIds)
    .order("step_index", { ascending: false });

  const latestByThread = new Map<string, { image_url: string }>();
  for (const item of latestItems ?? []) {
    if (!latestByThread.has(item.thread_id)) {
      latestByThread.set(item.thread_id, { image_url: item.image_url });
    }
  }

  const threadsWithItems = (threads ?? []).map((t) => ({
    ...t,
    items: latestByThread.has(t.id)
      ? [{ image_url: latestByThread.get(t.id)!.image_url }]
      : [],
  }));

  return NextResponse.json({ threads: threadsWithItems });
}

/** Create a new design playground thread. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    // empty body ok
  }

  const title = (body.title as string)?.trim() || "Untitled design";

  const { data: thread, error } = await supabase
    .from("design_playground_threads")
    .insert({
      user_id: user.id,
      title,
    })
    .select("id, title, created_at")
    .single();

  if (error) {
    console.error("[design-playground/threads]", error);
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }

  return NextResponse.json({ thread });
}
