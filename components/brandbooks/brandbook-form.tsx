"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Brandbook, BrandReferenceImage } from "@/types/database";

interface BrandbookFormProps {
  brandSpaceId: string;
  initialBrandbook?: Brandbook | null;
  referenceImages: BrandReferenceImage[];
}

export function BrandbookForm({
  brandSpaceId,
  initialBrandbook,
  referenceImages,
}: BrandbookFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [brandbook, setBrandbook] = useState(initialBrandbook);

  const handleGenerateBrandbook = async () => {
    setGenerating(true);
    try {
      // Get brand details from sessionStorage if available
      const storedDetails = typeof window !== "undefined" 
        ? sessionStorage.getItem(`brandDetails_${brandSpaceId}`)
        : null;
      const brandDetails = storedDetails ? JSON.parse(storedDetails) : null;

      const response = await fetch(`/api/brandbooks/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandSpaceId, brandDetails }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate brandbook");
      }

      const data = await response.json();
      setBrandbook(data);
    } catch (error) {
      console.error("Error generating brandbook:", error);
      alert("Failed to generate brandbook. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!brandbook) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/brandbooks`, {
        method: brandbook.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSpaceId,
          brandbook,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save brandbook");
      }

      router.push(`/brand-spaces/${brandSpaceId}`);
    } catch (error) {
      console.error("Error saving brandbook:", error);
      alert("Failed to save brandbook. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!brandbook) {
    return (
      <div className="bg-white p-8 rounded-lg border text-center">
        <p className="text-gray-600 mb-6">
          Generate your brandbook to get started. AI will analyze your brand information and create a comprehensive guide.
        </p>
        <button
          onClick={handleGenerateBrandbook}
          disabled={generating}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate Brandbook with AI"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Brandbook</h2>
          <button
            onClick={handleGenerateBrandbook}
            disabled={generating}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {generating ? "Regenerating..." : "Regenerate with AI"}
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Brand Personality</h3>
            <textarea
              value={brandbook.brand_personality}
              onChange={(e) =>
                setBrandbook({ ...brandbook, brand_personality: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Tone of Voice</h3>
            <textarea
              value={brandbook.tone_of_voice}
              onChange={(e) =>
                setBrandbook({ ...brandbook, tone_of_voice: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Visual Style</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Colors</label>
                <input
                  type="text"
                  value={Array.isArray(brandbook.visual_style?.colors) ? brandbook.visual_style.colors.join(", ") : ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      visual_style: {
                        ...brandbook.visual_style,
                        colors: e.target.value.split(",").map((c) => c.trim()),
                      },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., #FF5733, #33C3F0, #FFC300"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mood</label>
                <input
                  type="text"
                  value={brandbook.visual_style?.mood || ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      visual_style: { ...brandbook.visual_style, mood: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Image Style</label>
                <input
                  type="text"
                  value={brandbook.visual_style?.image_style || ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      visual_style: { ...brandbook.visual_style, image_style: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Do&apos;s and Don&apos;ts</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Do&apos;s</label>
                <textarea
                  value={Array.isArray(brandbook.dos_and_donts?.dos) ? brandbook.dos_and_donts.dos.join("\n") : ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      dos_and_donts: {
                        ...brandbook.dos_and_donts,
                        dos: e.target.value.split("\n").filter((l) => l.trim()),
                      },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={5}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Don&apos;ts</label>
                <textarea
                  value={Array.isArray(brandbook.dos_and_donts?.donts) ? brandbook.dos_and_donts.donts.join("\n") : ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      dos_and_donts: {
                        ...brandbook.dos_and_donts,
                        donts: e.target.value.split("\n").filter((l) => l.trim()),
                      },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={5}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Brandbook"}
          </button>
        </div>
      </div>
    </div>
  );
}
