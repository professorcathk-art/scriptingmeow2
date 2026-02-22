"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface LibraryFiltersProps {
  brandSpaces: Array<{ id: string; name: string }>;
  tags: string[];
  currentBrand?: string;
  currentTag?: string;
}

export function LibraryFilters({
  brandSpaces,
  tags,
  currentBrand,
  currentTag,
}: LibraryFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/library?${params.toString()}`);
  };

  return (
    <div className="bg-white p-4 rounded-lg border">
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Brand
          </label>
          <select
            value={currentBrand || ""}
            onChange={(e) => handleFilterChange("brand", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Brands</option>
            {brandSpaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Tag
          </label>
          <select
            value={currentTag || ""}
            onChange={(e) => handleFilterChange("tag", e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tags</option>
            {tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
