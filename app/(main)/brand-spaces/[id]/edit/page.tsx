import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EditBrandSpaceForm } from "@/components/brand-spaces/edit-brand-space-form";
import Link from "next/link";

export default async function EditBrandSpacePage({
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

  const brandSpaceWithDetails = brandSpace as typeof brandSpace & {
    brand_details?: {
      targetAudiences?: string;
      painPoints?: string;
      desiredOutcomes?: string;
      valueProposition?: string;
      otherBrandType?: string;
    };
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">
          Edit Brand Basic Info
        </h1>
        <p className="text-zinc-400">
          Update your brand name, type, and details. These inform your brandbook.
        </p>
      </div>

      <EditBrandSpaceForm
        brandSpaceId={params.id}
        initialData={{
          name: brandSpace.name,
          brand_type: brandSpace.brand_type,
          brand_details: brandSpaceWithDetails.brand_details,
        }}
      />

      <Link
        href={`/brand-spaces/${params.id}`}
        className="inline-block text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
      >
        ← Back to brand space
      </Link>
    </div>
  );
}
