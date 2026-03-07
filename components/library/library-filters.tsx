"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface LibraryFiltersProps {
  brandSpaces: Array<{ id: string; name: string }>;
  currentBrand?: string;
}

export function LibraryFilters({
  brandSpaces,
  currentBrand,
}: LibraryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/library?${params.toString()}`);
  };

  return (
    <div className="bg-zinc-900/50 p-4 rounded-2xl border border-white/10">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Filter by Brand
          </label>
          <select
            value={currentBrand || ""}
            onChange={(e) => handleFilterChange("brand", e.target.value)}
            className="px-3 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value="">All Brands</option>
            {brandSpaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
