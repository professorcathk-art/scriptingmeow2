import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BrandbookForm } from "@/components/brandbooks/brandbook-form";

export default async function BrandbookPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: brandSpace } = await supabase
    .from("brand_spaces")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!brandSpace) {
    redirect("/brand-spaces");
  }

  const { data: brandbook } = await supabase
    .from("brandbooks")
    .select("*")
    .eq("brand_space_id", params.id)
    .single();

  const { data: referenceImages } = await supabase
    .from("brand_reference_images")
    .select("*")
    .eq("brand_space_id", params.id)
    .order("uploaded_at", { ascending: false });

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-zinc-100 mb-2">
        Brandbook for {brandSpace.name}
      </h1>
      <p className="text-zinc-400 mb-6">
        Your AI-generated brandbook guides all future post generations.
      </p>
      <BrandbookForm
        brandSpaceId={params.id}
        initialBrandbook={brandbook}
        referenceImages={referenceImages || []}
        logoUrl={(brandSpace as { logo_url?: string | null }).logo_url ?? null}
        logoPlacement={(brandSpace as { logo_placement?: import("@/types/database").LogoPlacement | null }).logo_placement ?? null}
      />
    </div>
  );
}
