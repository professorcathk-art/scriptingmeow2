import { CreateBrandSpaceForm } from "@/components/brand-spaces/create-brand-space-form";

export default function NewBrandSpacePage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">
        Create New Brand Space
      </h1>
      <p className="text-zinc-400 mb-6">
        Step 1: The Vibe → Step 2: The Audience → Step 3: Visual References
      </p>
      <CreateBrandSpaceForm />
    </div>
  );
}
