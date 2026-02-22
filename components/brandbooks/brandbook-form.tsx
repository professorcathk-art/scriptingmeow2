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
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || "Failed to generate brandbook");
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

  const inputClass =
    "w-full px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50";
  const labelClass = "block text-sm font-medium text-zinc-400 mb-1";

  if (!brandbook) {
    return (
      <div className="bg-zinc-900/50 p-8 rounded-2xl border border-white/10 text-center">
        <p className="text-zinc-400 mb-6">
          Generate your brandbook to get started. AI will analyze your brand
          information and create a comprehensive guide.
        </p>
        <button
          onClick={handleGenerateBrandbook}
          disabled={generating}
          className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {generating ? "Generating..." : "Generate Brandbook with AI"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/50 p-6 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-zinc-100">Brandbook</h2>
          <button
            onClick={handleGenerateBrandbook}
            disabled={generating}
            className="text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50"
          >
            {generating ? "Regenerating..." : "Regenerate with AI"}
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">Brand Personality</h3>
            <textarea
              value={brandbook.brand_personality}
              onChange={(e) =>
                setBrandbook({ ...brandbook, brand_personality: e.target.value })
              }
              className={inputClass}
              rows={3}
            />
          </div>

          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">Tone of Voice</h3>
            <textarea
              value={brandbook.tone_of_voice}
              onChange={(e) =>
                setBrandbook({ ...brandbook, tone_of_voice: e.target.value })
              }
              className={inputClass}
              rows={3}
            />
          </div>

          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">Visual Style</h3>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Colors</label>
                <input
                  type="text"
                  value={
                    Array.isArray(brandbook.visual_style?.colors)
                      ? brandbook.visual_style.colors.join(", ")
                      : ""
                  }
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      visual_style: {
                        ...brandbook.visual_style,
                        colors: e.target.value.split(",").map((c) => c.trim()),
                      },
                    })
                  }
                  className={inputClass}
                  placeholder="e.g., #FF5733, #33C3F0, #FFC300"
                />
              </div>
              <div>
                <label className={labelClass}>Mood</label>
                <input
                  type="text"
                  value={brandbook.visual_style?.mood || ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      visual_style: {
                        ...brandbook.visual_style,
                        mood: e.target.value,
                      },
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Image Style</label>
                <input
                  type="text"
                  value={brandbook.visual_style?.image_style || (brandbook.visual_style as { imageStyle?: string })?.imageStyle || ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      visual_style: {
                        ...brandbook.visual_style,
                        image_style: e.target.value,
                      },
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>字型規範 (Typography)</label>
                <textarea
                  value={(brandbook.visual_style as { typographySpec?: string })?.typographySpec || ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      visual_style: {
                        ...brandbook.visual_style,
                        typographySpec: e.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  rows={3}
                  placeholder="Headings - font, size, color. Body - font, size. Emphasis style."
                />
              </div>
              <div>
                <label className={labelClass}>排版風格 (Layout Style)</label>
                <textarea
                  value={(brandbook.visual_style as { layoutStyleDetail?: string })?.layoutStyleDetail || ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      visual_style: {
                        ...brandbook.visual_style,
                        layoutStyleDetail: e.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  rows={3}
                  placeholder="Card/minimal/info-dense. Borders, spacing, text placement."
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">
              Do&apos;s and Don&apos;ts
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Do&apos;s</label>
                <textarea
                  value={
                    Array.isArray(brandbook.dos_and_donts?.dos)
                      ? brandbook.dos_and_donts.dos.join("\n")
                      : ""
                  }
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      dos_and_donts: {
                        ...brandbook.dos_and_donts,
                        dos: e.target.value
                          .split("\n")
                          .filter((l) => l.trim()),
                      },
                    })
                  }
                  className={inputClass}
                  rows={5}
                />
              </div>
              <div>
                <label className={labelClass}>Don&apos;ts</label>
                <textarea
                  value={
                    Array.isArray(brandbook.dos_and_donts?.donts)
                      ? brandbook.dos_and_donts.donts.join("\n")
                      : ""
                  }
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      dos_and_donts: {
                        ...brandbook.dos_and_donts,
                        donts: e.target.value
                          .split("\n")
                          .filter((l) => l.trim()),
                      },
                    })
                  }
                  className={inputClass}
                  rows={5}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Saving..." : "Save Brandbook"}
          </button>
        </div>
      </div>
    </div>
  );
}
