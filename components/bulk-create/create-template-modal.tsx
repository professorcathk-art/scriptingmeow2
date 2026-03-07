"use client";

import { useState } from "react";

type BrandSpace = { id: string; name: string };

const CONTENT_FRAMEWORKS = [
  { value: "educational-value", label: "Educational / Value" },
  { value: "engagement-relatable", label: "Engagement / Relatable" },
  { value: "promotional-proof", label: "Promotional / Proof" },
  { value: "storytelling", label: "Storytelling" },
];

const POST_STYLES = [
  { value: "immersive-photo", label: "Immersive Photo" },
  { value: "editorial", label: "Editorial" },
  { value: "text-heavy", label: "Text Heavy" },
  { value: "tweet-card", label: "Tweet / Quote Card" },
  { value: "split-screen", label: "Split Screen" },
];

const FORMATS = [
  { value: "square", label: "Square (1:1)" },
  { value: "portrait", label: "Portrait (4:5)" },
  { value: "story", label: "Story (9:16)" },
  { value: "reel-cover", label: "Reel Cover (9:16)" },
  { value: "custom", label: "Custom" },
];

interface CreateTemplateModalProps {
  brandSpaces: BrandSpace[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateTemplateModal({
  brandSpaces,
  onClose,
  onCreated,
}: CreateTemplateModalProps) {
  const [name, setName] = useState("");
  const [brandSpaceId, setBrandSpaceId] = useState("");
  const [contentFramework, setContentFramework] = useState("educational-value");
  const [postStyle, setPostStyle] = useState("immersive-photo");
  const [postType, setPostType] = useState<"single-image" | "carousel">("single-image");
  const [format, setFormat] = useState("square");
  const [customWidth, setCustomWidth] = useState(1080);
  const [customHeight, setCustomHeight] = useState(1080);
  const [carouselPageCount, setCarouselPageCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brandSpaceId) {
      setError("Name and brand are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          brandSpaceId,
          contentFramework,
          postStyle,
          postType,
          format,
          customWidth: format === "custom" ? customWidth : undefined,
          customHeight: format === "custom" ? customHeight : undefined,
          carouselPageCount: postType === "carousel" ? carouselPageCount : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to create template");
      }
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Create Template</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Template name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Carousel"
              className="w-full px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Brand Space *</label>
            <select
              value={brandSpaceId}
              onChange={(e) => setBrandSpaceId(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="">Select brand</option>
              {brandSpaces.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Content Framework</label>
            <select
              value={contentFramework}
              onChange={(e) => setContentFramework(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              {CONTENT_FRAMEWORKS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Visual Layout</label>
            <select
              value={postStyle}
              onChange={(e) => setPostStyle(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              {POST_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Post Type</label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value as "single-image" | "carousel")}
              className="w-full px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="single-image">Single Image</option>
              <option value="carousel">Carousel</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          {format === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Width (px)</label>
                <input
                  type="number"
                  min={100}
                  max={2000}
                  value={customWidth}
                  onChange={(e) => setCustomWidth(Math.min(2000, Math.max(100, parseInt(e.target.value, 10) || 1080)))}
                  className="w-full px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Height (px)</label>
                <input
                  type="number"
                  min={100}
                  max={2000}
                  value={customHeight}
                  onChange={(e) => setCustomHeight(Math.min(2000, Math.max(100, parseInt(e.target.value, 10) || 1080)))}
                  className="w-full px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100"
                />
              </div>
            </div>
          )}
          {postType === "carousel" && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Carousel pages</label>
              <select
                value={carouselPageCount}
                onChange={(e) => setCarouselPageCount(parseInt(e.target.value, 10))}
                className="w-full px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "page" : "pages"}
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Creating..." : "Create Template"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
