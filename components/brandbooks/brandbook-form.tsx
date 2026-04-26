"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Brandbook, BrandReferenceImage, LogoPlacement } from "@/types/database";

const LOGO_PLACEMENT_OPTIONS: { value: LogoPlacement | ""; label: string }[] = [
  { value: "", label: "--- please select ---" },
  { value: "none", label: "No logo" },
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

interface BrandbookFormProps {
  brandSpaceId: string;
  initialBrandbook?: Brandbook | null;
  referenceImages: BrandReferenceImage[];
  logoUrl?: string | null;
  logoPlacement?: LogoPlacement | null;
}

export function BrandbookForm({
  brandSpaceId,
  initialBrandbook,
  referenceImages: initialRefImages,
  logoUrl: initialLogoUrl,
  logoPlacement: initialLogoPlacement,
}: BrandbookFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [brandbook, setBrandbook] = useState(initialBrandbook);
  const [referenceImages, setReferenceImages] = useState(initialRefImages);
  const [hasEdited, setHasEdited] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl ?? null);
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement | "" | null>(
    initialLogoPlacement ?? ""
  );
  const [savingPlacement, setSavingPlacement] = useState(false);
  const initIdRef = useRef(initialBrandbook?.id);

  useEffect(() => {
    setReferenceImages(initialRefImages);
  }, [initialRefImages]);

  useEffect(() => {
    setLogoUrl(initialLogoUrl ?? null);
    setLogoPlacement(initialLogoPlacement ?? "");
  }, [initialLogoUrl, initialLogoPlacement]);

  useEffect(() => {
    if (!initialBrandbook) return;
    if (initialBrandbook.id !== initIdRef.current) {
      initIdRef.current = initialBrandbook.id;
      setBrandbook(initialBrandbook);
      setHasEdited(false);
    } else if (!hasEdited) {
      setBrandbook(initialBrandbook);
    }
  }, [initialBrandbook, hasEdited]);

  const [removingImageId, setRemovingImageId] = useState<string | null>(null);

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

  const handleRemoveImage = async (imageId: string) => {
    setRemovingImageId(imageId);
    try {
      const res = await fetch(`/api/brand-spaces/${brandSpaceId}/images/${imageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove image");
      await fetchReferenceImages();
      router.refresh();
    } catch {
      alert("Failed to remove image");
    } finally {
      setRemovingImageId(null);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/brand-spaces/${brandSpaceId}/logo`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setLogoUrl(data.logoUrl ?? null);
      router.refresh();
    } catch {
      alert("Failed to upload logo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleLogoRemove = async () => {
    try {
      const res = await fetch(`/api/brand-spaces/${brandSpaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: null }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      setLogoUrl(null);
      router.refresh();
    } catch {
      alert("Failed to remove logo");
    }
  };

  const handleLogoPlacementChange = async (value: LogoPlacement | "") => {
    if (value === "") {
      setLogoPlacement("");
      return;
    }
    setSavingPlacement(true);
    try {
      const res = await fetch(`/api/brand-spaces/${brandSpaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoPlacement: value }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setLogoPlacement(value);
      router.refresh();
    } catch {
      alert("Failed to save logo placement");
    } finally {
      setSavingPlacement(false);
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
    const placementNotSelected = logoPlacement === "" || logoPlacement === null || logoPlacement === undefined;
    if (logoUrl && placementNotSelected) {
      alert("Required: choose where your logo appears on generated posts. Select an option from the dropdown (including 'No logo' if you don't want the logo on posts).");
      return;
    }
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
      router.refresh();
    } catch (error) {
      console.error("Error generating brandbook:", error);
      alert("Failed to generate brandbook. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!brandbook) return;

    const placementNotSelected = logoPlacement === "" || logoPlacement === null || logoPlacement === undefined;
    if (logoUrl && placementNotSelected) {
      alert(
        "Please choose logo placement before saving. Use the dropdown to pick where your logo appears on generated posts, or choose \"No logo\" if you do not want a logo on posts."
      );
      return;
    }

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

      router.refresh();
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

  const logoSection = (
    <div className="bg-zinc-900/50 p-4 rounded-xl border border-white/10">
      <h3 className="font-semibold text-zinc-100 mb-2">Brand Logo</h3>
      <p className="text-sm text-zinc-400 mb-3">
        Upload your logo to include it in generated posts. Choose where it appears.
      </p>
      {logoUrl ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <img
              src={logoUrl}
              alt="Brand logo"
              className="w-20 h-20 object-contain rounded-lg border border-white/10"
            />
            <div className="flex gap-2">
              <label className="px-4 py-2 rounded-xl bg-white/10 cursor-pointer hover:bg-white/15 text-white text-sm transition-colors">
                {uploading ? "Uploading..." : "Change Logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleLogoUpload}
                />
              </label>
              <button
                type="button"
                onClick={handleLogoRemove}
                className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-red-400 text-sm"
              >
                Remove
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Logo placement in generated images *
            </label>
            <p className="text-xs text-zinc-500 mb-2">Required: choose where your logo appears on generated posts (or &quot;No logo&quot; if you don&apos;t want it on posts).</p>
            <select
              value={logoPlacement ?? ""}
              onChange={(e) => handleLogoPlacementChange(e.target.value as LogoPlacement | "")}
              disabled={savingPlacement}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              {LOGO_PLACEMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <label className="block border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-violet-500/30 transition-colors">
          <span className="text-zinc-400 text-sm">
            {uploading ? "Uploading..." : "Click to upload logo"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={handleLogoUpload}
          />
        </label>
      )}
    </div>
  );

  if (!brandbook) {
    return (
      <div className="bg-zinc-900/50 p-8 rounded-2xl border border-white/10 space-y-6">
        {logoSection}
        <div>
          <h3 className="font-semibold text-zinc-100 mb-2">Sample Posts (Reference Images)</h3>
          <p className="text-sm text-zinc-400 mb-3">
            Upload 3–10 of your past IG posts or style references. AI will analyze them for colors, typography, and art style (e.g. watercolor).
          </p>
          {referenceImages.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-3">
              {referenceImages.map((img) => (
                <div key={img.id} className="relative">
                  <img
                    src={img.image_url}
                    alt="Sample post"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(img.id)}
                    disabled={removingImageId === img.id}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500/90 text-white text-sm font-bold hover:bg-red-500 disabled:opacity-50 flex items-center justify-center shadow-lg"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
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
          {generating && (
            <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
              Please stay on this page. Do not leave or refresh while AI is generating. This may take a minute.
            </div>
          )}
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
        <p className="text-sm text-zinc-400 mb-3">
          Preview, remove, or add more reference images to improve style analysis when regenerating.
        </p>
        {referenceImages.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-3">
            {referenceImages.map((img) => (
              <div key={img.id} className="relative">
                <img
                  src={img.image_url}
                  alt="Sample post"
                  className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-white/10"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img.id)}
                  disabled={removingImageId === img.id}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500/90 text-white text-sm font-bold hover:bg-red-500 disabled:opacity-50 flex items-center justify-center shadow-lg"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
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
            {uploading ? "Uploading..." : "Add more images"} · {referenceImages.length} total
          </label>
        </div>
      </div>
      <div className="bg-zinc-900/50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
        {generating && (
          <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
            Please stay on this page. Do not leave or refresh while AI is generating.
          </div>
        )}
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
          {logoSection}

          <div>
            <h3 className="font-semibold text-zinc-100 mb-2">Tone of Voice</h3>
            <textarea
              value={brandbook.tone_of_voice ?? ""}
              onChange={(e) => {
                setHasEdited(true);
                setBrandbook((prev) => (prev ? { ...prev, tone_of_voice: e.target.value } : prev));
              }}
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
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  {[
                    { i: 0, label: "Primary background" },
                    { i: 1, label: "Secondary background" },
                    { i: 2, label: "Primary text" },
                    { i: 3, label: "Secondary text" },
                    { i: 4, label: "Backup color" },
                  ].map(({ i, label }) => {
                    const colors = Array.isArray(brandbook.visual_style?.colors) ? [...brandbook.visual_style.colors] : [];
                    const padded = [...colors];
                    while (padded.length < 5) padded.push("");
                    const hex = (padded[i] ?? "").trim();
                    const normalizedHex = hex.startsWith("#") ? hex : hex ? `#${hex}` : "#808080";
                    return (
                      <div key={i} className="flex flex-col gap-2">
                        <span className="text-xs text-zinc-400">{label}</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={normalizedHex}
                            onChange={(e) => {
                              setHasEdited(true);
                              const next = [...padded];
                              next[i] = e.target.value;
                              setBrandbook((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      visual_style: {
                                        ...prev.visual_style,
                                        colors: next.slice(0, 5).map((c) => (c && String(c).trim()) || ""),
                                      },
                                    }
                                  : prev
                              );
                            }}
                            className="w-12 h-12 rounded-xl cursor-pointer border-2 border-white/20 bg-transparent"
                            title={label}
                          />
                          <input
                            type="text"
                            value={hex}
                            onChange={(e) => {
                              setHasEdited(true);
                              const val = e.target.value.trim();
                              const next = [...padded];
                              next[i] = val ? (val.startsWith("#") ? val : `#${val}`) : "";
                              setBrandbook((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      visual_style: {
                                        ...prev.visual_style,
                                        colors: next.slice(0, 5).map((c) => (c && String(c).trim()) || ""),
                                      },
                                    }
                                  : prev
                              );
                            }}
                            placeholder="#hex"
                            className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelClass}>Color Description (how to use)</label>
                <p className="text-xs text-zinc-500 mb-2">
                  Describe how to apply the palette—e.g. &quot;Primary background for main areas. Secondary for labels. Use backup to highlight keywords.&quot; Exact hex codes come from the palette above.
                </p>
                <textarea
                  value={(brandbook.visual_style as { colorDescriptionDetailed?: string })?.colorDescriptionDetailed ?? ""}
                  onChange={(e) => {
                    setHasEdited(true);
                    setBrandbook((prev) =>
                      prev
                        ? {
                            ...prev,
                            visual_style: { ...prev.visual_style, colorDescriptionDetailed: e.target.value },
                          }
                        : prev
                    );
                  }}
                  className={inputClass}
                  rows={2}
                  placeholder="e.g. Primary for backgrounds, secondary for labels, backup to highlight keywords"
                />
              </div>
              <div>
                <label className={labelClass}>Line Style</label>
                <textarea
                  value={(brandbook.visual_style as { lineStyle?: string })?.lineStyle ?? ""}
                  onChange={(e) => {
                    setHasEdited(true);
                    setBrandbook((prev) =>
                      prev
                        ? {
                            ...prev,
                            visual_style: { ...prev.visual_style, lineStyle: e.target.value },
                          }
                        : prev
                    );
                  }}
                  className={inputClass}
                  rows={2}
                  placeholder="Edge quality, stroke feel. e.g. hand-drawn pencil/ink, bleed effect. Markdown allowed."
                />
              </div>
              <div>
                <label className={labelClass}>Image Style</label>
                <textarea
                  value={brandbook.visual_style?.image_style ?? (brandbook.visual_style as { imageStyle?: string })?.imageStyle ?? ""}
                  onChange={(e) => {
                    setHasEdited(true);
                    setBrandbook((prev) =>
                      prev
                        ? {
                            ...prev,
                            visual_style: { ...prev.visual_style, image_style: e.target.value },
                          }
                        : prev
                    );
                  }}
                  className={inputClass}
                  rows={4}
                />
              </div>
              <div>
                <label className={labelClass}>Typography</label>
                <textarea
                  value={(brandbook.visual_style as { typographySpec?: string })?.typographySpec ?? ""}
                  onChange={(e) => {
                    setHasEdited(true);
                    setBrandbook((prev) =>
                      prev
                        ? {
                            ...prev,
                            visual_style: { ...prev.visual_style, typographySpec: e.target.value },
                          }
                        : prev
                    );
                  }}
                  className={inputClass}
                  rows={3}
                  placeholder="Headings - font, size, color. Body - font, size. Emphasis style."
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
                  onChange={(e) => {
                    setHasEdited(true);
                    setBrandbook((prev) =>
                      prev
                        ? {
                            ...prev,
                            dos_and_donts: {
                              ...prev.dos_and_donts,
                              dos: e.target.value.split("\n").filter((l) => l.trim()),
                            },
                          }
                        : prev
                    );
                  }}
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
                  onChange={(e) => {
                    setHasEdited(true);
                    setBrandbook((prev) =>
                      prev
                        ? {
                            ...prev,
                            dos_and_donts: {
                              ...prev.dos_and_donts,
                              donts: e.target.value.split("\n").filter((l) => l.trim()),
                            },
                          }
                        : prev
                    );
                  }}
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
