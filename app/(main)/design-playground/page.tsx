import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DesignPlaygroundThreads } from "@/components/design-playground/design-playground-threads";

export default async function DesignPlaygroundPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: brandSpaces } = await supabase
    .from("brand_spaces")
    .select("id, name")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: userProfile } = await supabase
    .from("users")
    .select("credits_remaining")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">
        Design Playground
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Create posters, graphics, or any design. Start a new design or continue from a thread. Reference images can be style refs, logos, or real assets. All outputs auto-save to Library → My design.
      </p>
      <DesignPlaygroundThreads
        brandSpaces={brandSpaces ?? []}
        userCredits={userProfile?.credits_remaining ?? 0}
      />
    </div>
  );
}
