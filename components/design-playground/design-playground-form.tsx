"use client";

import { useState } from "react";
import { useCredits } from "@/components/credits/credits-provider";
import { FourKToggle } from "@/components/credits/four-k-toggle";
import { DIMENSION_PRESETS, MAX_DIMENSION_PX, parseWidthHeight } from "@/lib/dimensions";

interface DesignItem {
  id: string;
  image_url: string;
  step_index: number;
  prompt?: string;
  comment?: string;
  created_at: string;
}

interface DesignPlaygroundFormProps {
  brandSpaces: { id: string; name: string }[];
  userCredits: number;
  threadId?: string;
  initialPrompt?: string;
  initialDimension?: string;
  initialItems?: DesignItem[];
  onThreadId?: (id: string) => void;
  compact?: boolean;
}

type ChatItem = { type: "user"; text: string } | { type: "image"; url: string };

export function DesignPlaygroundForm({
  brandSpaces,
  userCredits: initialCredits,
  threadId: initialThreadId,
  initialPrompt = "",
  initialDimension = "1:1",
  initialItems = [],
  onThreadId,
  compact = false,
}: DesignPlaygroundFormProps) {
  const creditsCtx = useCredits();
  const userCredits = creditsCtx?.creditsRemaining ?? initialCredits;
  const fourKCreditsRemaining = creditsCtx?.fourKCreditsRemaining ?? 0;

  const buildChatHistoryFromItems = (items: DesignItem[]): ChatItem[] => {
    const out: ChatItem[] = [];
    for (const item of items) {
      if (item.comment) out.push({ type: "user", text: item.comment });
      out.push({ type: "image", url: item.image_url });
    }
    return out;
  };

  const lastImage = initialItems.length > 0 ? initialItems[initialItems.length - 1]?.image_url : null;

  const [prompt, setPrompt] = useState(initialPrompt);
  const [dimension, setDimension] = useState(initialDimension);
  const [customWidth, setCustomWidth] = useState("");
  const [customHeight, setCustomHeight] = useState("");
  const [customUnit, setCustomUnit] = useState<"px" | "mm">("px");
  const [brandSpaceId, setBrandSpaceId] = useState("");
  const [referenceUrls, setReferenceUrls] = useState<string[]>([]);
  const [referenceUploading, setReferenceUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(lastImage);
  const [chatHistory, setChatHistory] = useState<ChatItem[]>(() => buildChatHistoryFromItems(initialItems));
  const [refineComment, setRefineComment] = useState("");
  const [is4KEnabled, setIs4KEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [savingImage, setSavingImage] = useState(false);

  const handleUploadReferences = async (files: FileList | null) => {
    if (!files?.length) return;
    setReferenceUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      for (let i = 0; i < files.length; i++) {
        fd.append("files", files[i]);
      }
      const res = await fetch("/api/upload/references", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const urls = (data.imageUrls ?? []) as string[];
      setReferenceUrls((prev) => [...prev, ...urls].slice(0, 3));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setReferenceUploading(false);
    }
  };

  const removeReference = (url: string) => {
    setReferenceUrls((prev) => prev.filter((u) => u !== url));
  };

  const buildDimensionPayload = () => {
    if (dimension === "custom" && customWidth.trim() && customHeight.trim()) {
      return {
        dimension: "custom",
        customDimension: `${customWidth.trim()}x${customHeight.trim()}`,
        customUnit,
      };
    }
    return { dimension };
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Enter a prompt");
      return;
    }
    if (dimension === "custom") {
      const parsed = parseWidthHeight(customWidth, customHeight, customUnit);
      if (!parsed) {
        setError(`Enter valid width and height. Max ${MAX_DIMENSION_PX}px per side.`);
        return;
      }
    }
    if (userCredits < 1) {
      setError("Not enough credits");
      return;
    }
    if (is4KEnabled && fourKCreditsRemaining < 1) {
      setError("Not enough 4K upgrade credits");
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/design-playground/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          brandSpaceId: brandSpaceId || undefined,
          referenceImageUrls: referenceUrls,
          threadId: threadId || undefined,
          is4KEnabled,
          ...buildDimensionPayload(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setCurrentImageUrl(data.imageUrl);
      setChatHistory([{ type: "image", url: data.imageUrl }]);
      if (data.threadId) {
        setThreadId(data.threadId);
        onThreadId?.(data.threadId);
      }
      if (typeof data.credits_remaining === "number") {
        creditsCtx?.setCredits(data.credits_remaining);
      }
      if (typeof data.four_k_credits === "number") {
        creditsCtx?.setFourKCredits(data.four_k_credits);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!refineComment.trim() || !currentImageUrl) return;
    if (userCredits < 1) {
      setError("Not enough credits");
      return;
    }
    setRefining(true);
    setError(null);
    try {
      const res = await fetch("/api/design-playground/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentImageUrl,
          comment: refineComment.trim(),
          threadId: threadId || undefined,
          ...buildDimensionPayload(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Refinement failed");
      setCurrentImageUrl(data.imageUrl);
      setChatHistory((prev) => [
        ...prev,
        { type: "user", text: refineComment.trim() },
        { type: "image", url: data.imageUrl },
      ]);
      setRefineComment("");
      if (typeof data.credits_remaining === "number") {
        creditsCtx?.setCredits(data.credits_remaining);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refinement failed");
    } finally {
      setRefining(false);
    }
  };

  const handleSaveImage = async () => {
    if (!currentImageUrl) return;
    setSavingImage(true);
    setError(null);
    try {
      const res = await fetch("/api/library/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: currentImageUrl,
          sourceType: "design_playground",
          sourceId: threadId,
          metadata: { prompt: prompt.slice(0, 500) },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSavingImage(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save to library failed");
    } finally {
      setSavingImage(false);
    }
  };

  const handleDownloadImage = () => {
    if (!currentImageUrl) return;
    try {
      const link = document.createElement("a");
      link.href = currentImageUrl;
      link.download = `design-${threadId || "export"}.png`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    } catch {
      window.open(currentImageUrl, "_blank");
    }
  };

  const isLoading = generating || refining;

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
          Please stay on this page. Do not leave or refresh while AI is generating.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Brand (optional)
            </label>
            <select
              value={brandSpaceId}
              onChange={(e) => setBrandSpaceId(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value="">No brand — free design</option>
              {brandSpaces.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              What do you want to design? *
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              placeholder="e.g. A minimalist poster for a coffee shop grand opening. Warm earth tones, typography-focused, with a steam rising from a cup."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Reference images (optional, max 3)
            </label>
            <p className="text-xs text-zinc-500 mb-2">
              Style references, logos, or real assets to include. Can be anything.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-sm">
                {referenceUploading ? "Uploading…" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  disabled={referenceUploading || referenceUrls.length >= 3}
                  onChange={(e) => {
                    handleUploadReferences(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              {referenceUrls.map((url) => (
                <div key={url} className="relative group">
                  <img
                    src={url}
                    alt="Ref"
                    className="w-16 h-16 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => removeReference(url)}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Dimension
            </label>
            <select
              value={dimension}
              onChange={(e) => setDimension(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              {DIMENSION_PRESETS.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            {dimension === "custom" && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  placeholder="Width"
                  className="flex-1 px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                />
                <span className="text-zinc-500 shrink-0">×</span>
                <input
                  type="text"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  placeholder="Height"
                  className="flex-1 px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 text-sm"
                />
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value as "px" | "mm")}
                  className="px-3 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm shrink-0"
                >
                  <option value="px">px</option>
                  <option value="mm">mm</option>
                </select>
              </div>
            )}
            {dimension === "custom" && (
              <p className="text-xs text-zinc-500 mt-1">
                Max {MAX_DIMENSION_PX}px per side
              </p>
            )}
          </div>

          <FourKToggle
            enabled={is4KEnabled}
            onChange={setIs4KEnabled}
            fourKCreditsRemaining={fourKCreditsRemaining}
            disabled={generating}
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || userCredits < 1 || (is4KEnabled && fourKCreditsRemaining < 1)}
              className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Generating…" : "Generate (1 credit)"}
            </button>
            <span className="text-sm text-zinc-500">
              Credits: {userCredits}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-zinc-100">
            Output
          </h3>
          {currentImageUrl ? (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-white/10 bg-zinc-900/50">
                <img
                  src={currentImageUrl}
                  alt="Generated design"
                  className="w-full h-auto max-h-[500px] object-contain"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveImage}
                  disabled={savingImage}
                  className="px-4 py-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 disabled:opacity-50"
                >
                  {savingImage ? "Saving…" : "Save to Library"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  className="px-4 py-2 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/5"
                >
                  Download
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Refine with feedback (1 credit per refinement)
                </label>
                <div className="flex flex-col gap-2">
                  <textarea
                    value={refineComment}
                    onChange={(e) => setRefineComment(e.target.value)}
                    placeholder="e.g. Make the text larger, add more contrast, change the background color..."
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-y min-h-[100px]"
                  />
                  <button
                    type="button"
                    onClick={handleRefine}
                    disabled={refining || !refineComment.trim() || userCredits < 1}
                    className="self-start px-4 py-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 disabled:opacity-50"
                  >
                    {refining ? "Refining…" : "Refine"}
                  </button>
                </div>
              </div>

              {chatHistory.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">History</p>
                  {chatHistory.map((item, i) =>
                    item.type === "user" ? (
                      <p key={i} className="text-sm text-zinc-400 italic">
                        You: {item.text}
                      </p>
                    ) : (
                      <img
                        key={i}
                        src={item.url}
                        alt="Version"
                        className="w-24 h-24 object-cover rounded-lg border border-white/10"
                      />
                    )
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-white/10 p-12 text-center text-zinc-500">
              Generated design will appear here. Images auto-save to Library → My design.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
