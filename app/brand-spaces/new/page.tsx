import { CreateBrandSpaceForm } from "@/components/brand-spaces/create-brand-space-form";

export default function NewBrandSpacePage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        Create New Brand Space
      </h1>
      <CreateBrandSpaceForm />
    </div>
  );
}
