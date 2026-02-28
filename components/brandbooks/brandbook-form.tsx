"use client";

import { useState, useEffect } from "react";
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
  referenceImages: initialRefImages,
}: BrandbookFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [brandbook, setBrandbook] = useState(initialBrandbook);
  const [referenceImages, setReferenceImages] = useState(initialRefImages);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setReferenceImages(initialRefImages);
  }, [initialRefImages]);

  const fetchReferenceImages = async () => {
    try {
      const res = await fetch(`/api/brand-spaces/${brandSpaceId}/images`);
      if (res.ok) {
        const { images } = await res.json();
        setReferenceImages(images ?? []);
      }
    } catch {
      // ignore
    }
  };

  const handleUploadImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const fd = new FormData();
        fd.append("files", file);
        const res = await fetch(`/api/brand-spaces/${brandSpaceId}/images`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Upload failed");
        }
      }
      await fetchReferenceImages();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Upload failed. Ensure Storage bucket 'brand-reference-images' exists and SUPABASE_SERVICE_ROLE_KEY is set.");
    } finally {
      setUploading(false);
    }
  };

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
      <div className="bg-zinc-900/50 p-8 rounded-2xl border border-white/10 space-y-6">
        <div>
          <h3 className="font-semibold text-zinc-100 mb-2">Sample Posts (Reference Images)</h3>
          <p className="text-sm text-zinc-400 mb-3">
            Upload 3–10 of your past IG posts or style references. AI will analyze them for colors, typography, and art style (e.g. watercolor).
          </p>
          <div
            className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-violet-500/30 transition-colors cursor-pointer"
            onDragOver={(e) => { e.preventDefault(); }}
            onDrop={(e) => {
              e.preventDefault();
              handleUploadImages(e.dataTransfer?.files ?? null);
            }}
          >
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              id="brandbook-upload"
              onChange={(e) => handleUploadImages(e.target.files)}
            />
            <label htmlFor="brandbook-upload" className="cursor-pointer block">
              <p className="text-zinc-400 mb-2">
                {uploading ? "Uploading..." : "Drag & drop or click to upload"}
              </p>
              {referenceImages.length > 0 && (
                <p className="text-sm text-violet-400">{referenceImages.length} image(s) ready for analysis</p>
              )}
            </label>
          </div>
        </div>
        <div className="text-center">
          <p className="text-zinc-400 mb-4">
            Generate your brandbook. AI will analyze your brand info{referenceImages.length > 0 ? " and sample images" : ""}.
          </p>
          <button
            onClick={handleGenerateBrandbook}
            disabled={generating}
            className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {generating ? "Generating..." : "Generate Brandbook with AI"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/10">
        <h3 className="font-semibold text-zinc-100 mb-2">Sample Posts (for regeneration)</h3>
        <p className="text-sm text-zinc-400 mb-2">
          Add more reference images to improve style analysis when regenerating.
        </p>
        <div
          className="border-2 border-dashed border-white/10 rounded-lg p-4 text-center hover:border-violet-500/30 transition-colors cursor-pointer"
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); handleUploadImages(e.dataTransfer?.files ?? null); }}
        >
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            id="brandbook-upload-edit"
            onChange={(e) => handleUploadImages(e.target.files)}
          />
          <label htmlFor="brandbook-upload-edit" className="cursor-pointer text-sm text-zinc-400">
            {uploading ? "Uploading..." : "Upload images"} · {referenceImages.length} total
          </label>
        </div>
      </div>
      <div className="bg-zinc-900/50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
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
                <label className={labelClass}>Color Palette (up to 5 colors)</label>
                <p className="text-xs text-zinc-500 mb-2">Choose or enter hex codes. Used for consistent IG post generation.</p>
                <div className="flex flex-wrap gap-3">
                  {[0, 1, 2, 3, 4].map((i) => {
                    const colors = Array.isArray(brandbook.visual_style?.colors) ? [...brandbook.visual_style.colors] : [];
                    const padded = [...colors];
                    while (padded.length < 5) padded.push("");
                    const hex = (padded[i] ?? "").trim();
                    const normalizedHex = hex.startsWith("#") ? hex : hex ? `#${hex}` : "#808080";
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={normalizedHex}
                          onChange={(e) => {
                            const next = [...padded];
                            next[i] = e.target.value;
                            setBrandbook({
                              ...brandbook,
                              visual_style: {
                                ...brandbook.visual_style,
                                colors: next.filter((c) => c && String(c).trim()),
                              },
                            });
                          }}
                          className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white/20 bg-transparent"
                          title={`Color ${i + 1}`}
                        />
                        <input
                          type="text"
                          value={hex}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            const next = [...padded];
                            next[i] = val ? (val.startsWith("#") ? val : `#${val}`) : "";
                            setBrandbook({
                              ...brandbook,
                              visual_style: {
                                ...brandbook.visual_style,
                                colors: next.filter((c) => c && String(c).trim()),
                              },
                            });
                          }}
                          placeholder="#hex"
                          className="w-24 px-2 py-1.5 rounded-lg bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelClass}>Color Description (Detailed)</label>
                <textarea
                  value={(brandbook.visual_style as { colorDescriptionDetailed?: string })?.colorDescriptionDetailed || ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      visual_style: {
                        ...brandbook.visual_style,
                        colorDescriptionDetailed: e.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  rows={4}
                  placeholder="Overall tone, primary colors with hex + purpose, secondary colors with hex + purpose. Markdown allowed."
                />
              </div>
              <div>
                <label className={labelClass}>視覺氣質 (Visual Aura)</label>
                <textarea
                  value={(brandbook.visual_style as { visualAura?: string })?.visualAura || ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      visual_style: {
                        ...brandbook.visual_style,
                        visualAura: e.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  rows={2}
                  placeholder="Layout mood, breathing room, spacing philosophy. Markdown allowed."
                />
              </div>
              <div>
                <label className={labelClass}>線條風格 (Line Style)</label>
                <textarea
                  value={(brandbook.visual_style as { lineStyle?: string })?.lineStyle || ""}
                  onChange={(e) =>
                    setBrandbook({
                      ...brandbook,
                      visual_style: {
                        ...brandbook.visual_style,
                        lineStyle: e.target.value,
                      },
                    })
                  }
                  className={inputClass}
                  rows={2}
                  placeholder="Edge quality, stroke feel. e.g. hand-drawn pencil/ink, bleed effect. Markdown allowed."
                />
              </div>
              <div>
                <label className={labelClass}>Image Style</label>
                <textarea
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
                  rows={4}
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
