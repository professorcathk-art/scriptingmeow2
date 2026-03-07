import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DesignPlaygroundForm } from "@/components/design-playground/design-playground-form";

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
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">
        Design Playground
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Create posters, graphics, or any design with a free prompt. Optional: add brand style, reference images. Refine with feedback. 1 credit per generation.
      </p>
      <DesignPlaygroundForm
        brandSpaces={brandSpaces ?? []}
        userCredits={userProfile?.credits_remaining ?? 0}
      />
    </div>
  );
}
