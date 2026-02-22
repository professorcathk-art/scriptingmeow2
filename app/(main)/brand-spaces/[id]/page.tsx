import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DeleteBrandButton } from "@/components/brand-spaces/delete-brand-button";

export default async function BrandSpaceDetailPage({
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
    .select("id")
    .eq("brand_space_id", params.id)
    .single();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {brandSpace.name}
        </h1>
        <p className="text-zinc-400 capitalize">
          {brandSpace.brand_type.replace("-", " ")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href={`/brand-spaces/${params.id}/brandbook`}
          className="block p-6 glass rounded-2xl border border-white/5 hover:border-violet-500/30 transition-all group"
        >
          <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-violet-400 transition-colors">
            Brandbook
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            {brandbook
              ? "View and edit your AI-generated brand guidelines"
              : "Generate your brandbook with AI"}
          </p>
          <span className="text-sm text-violet-400 group-hover:text-violet-300">
            {brandbook ? "Edit brandbook →" : "Create brandbook →"}
          </span>
        </Link>

        <Link
          href="/create-post"
          className="block p-6 glass rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all group"
        >
          <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
            Create Post
          </h2>
          <p className="text-zinc-400 text-sm mb-4">
            Generate Instagram posts for this brand
          </p>
          <span className="text-sm text-cyan-400 group-hover:text-cyan-300">
            Create post →
          </span>
        </Link>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Link
          href={`/brand-spaces/${params.id}/edit`}
          className="px-4 py-2 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Edit brand info
        </Link>
        <Link
          href="/brand-spaces"
          className="px-4 py-2 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Back to Brand Spaces
        </Link>
        <DeleteBrandButton brandSpaceId={params.id} brandName={brandSpace.name} />
      </div>
    </div>
  );
}
