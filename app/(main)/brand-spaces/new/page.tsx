import { CreateBrandSpaceForm } from "@/components/brand-spaces/create-brand-space-form";

export default function NewBrandSpacePage({
  searchParams,
}: {
  searchParams: { name?: string };
}) {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold text-white mb-2">
        Create New Brand Space
      </h1>
      <p className="text-zinc-400 mb-6">
        This helps ensure your posts serve your purpose. It&apos;s the first step of creating a social media post.
      </p>
      <CreateBrandSpaceForm initialName={searchParams.name} />
    </div>
  );
}
