"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GeneratedPost, DraftData } from "@/types/database";
import { SaveTemplateModal } from "./save-template-modal";

interface PostReviewProps {
  post: GeneratedPost & { brand_spaces?: { name: string }; format?: string };
}

type CaptionShape =
  | { igCaption: string }
  | { hook: string; body: string; cta: string; hashtags: string[] };

/** Build full caption as one block for copy-paste. Supports both new (igCaption) and legacy (hook/body/cta/hashtags) formats. */
function captionToParagraph(c: CaptionShape): string {
  if (c && "igCaption" in c && typeof (c as { igCaption?: string }).igCaption === "string") {
    return (c as { igCaption: string }).igCaption;
  }
  const old = c as { hook: string; body: string; cta: string; hashtags: string[] };
  const parts = [old.hook, old.body, old.cta].filter(Boolean);
  const hashtags = Array.isArray(old.hashtags) ? old.hashtags.filter(Boolean) : [];
  const hashtagStr = hashtags.length ? hashtags.join(" ") : "";
  return [...parts, hashtagStr].filter(Boolean).join("\n\n");
}

/** Parse one-block caption back. New format: single igCaption. Legacy: hook, body, cta, hashtags. */
function paragraphToCaption(text: string): CaptionShape {
  return { igCaption: text.trim() };
}

export function PostReview({ post: initialPost }: PostReviewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState(initialPost);
  const [caption, setCaption] = useState(initialPost.caption);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draftData, setDraftData] = useState<DraftData | null>(() => {
    const d = (initialPost as { draft_data?: DraftData }).draft_data;
    if (d && "visualAdvice" in d && "imageTextOnImage" in d) return d;
    return null;
  });

  useEffect(() => {
    setPost(initialPost);
    setCaption(initialPost.caption);
    const d = (initialPost as { draft_data?: DraftData }).draft_data;
    if (d && "visualAdvice" in d && "imageTextOnImage" in d) setDraftData(d);
  }, [initialPost]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload: { caption: CaptionShape; status: string; draft_data?: DraftData } = {
        caption,
        status: "saved",
      };
      if (draftData) payload.draft_data = draftData;
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save post");
      }

      router.push("/library");
    } catch (error) {
      console.error("Error saving post:", error);
      alert("Failed to save post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCaption = async () => {
    const text = captionToParagraph(caption);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Failed to copy");
    }
  };

  const handleSaveImage = async (url?: string, index?: number) => {
    const targetUrl = url ?? post.visual_url;
    if (!targetUrl || imageError) return;
    try {
      const res = await fetch(targetUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `post-${post.id}${index != null ? `-page-${index + 1}` : ""}.png`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      const link = document.createElement("a");
      link.href = targetUrl;
      link.download = `post-${post.id}${index != null ? `-page-${index + 1}` : ""}.png`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
    }
  };

  const carouselUrls = post.carousel_urls ?? [];
  const hasCarousel = carouselUrls.length > 0;
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<{ url: string; alt: string } | null>(null);

  const postWithCustom = post as { custom_width?: number; custom_height?: number };
  const customAspect =
    post.format === "custom" && postWithCustom.custom_width && postWithCustom.custom_height
      ? `${postWithCustom.custom_width} / ${postWithCustom.custom_height}`
      : post.format === "portrait"
        ? "4/5"
        : post.format === "story" || post.format === "reel-cover"
          ? "9/16"
          : "1/1";

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Review Your Post</h1>
        <p className="text-zinc-400">
          Brand: {post.brand_spaces?.name || "Unknown"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-elevated p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">
              {hasCarousel ? "Carousel Preview" : "Visual Preview"}
            </h2>
          </div>
          {hasCarousel ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {carouselUrls.map((url, index) => (
                <div
                  key={index}
                  className="relative group bg-white/5 rounded-xl overflow-hidden cursor-zoom-in"
                  style={{ aspectRatio: customAspect }}
                  onClick={() => setFullScreenImage({ url, alt: `Carousel page ${index + 1}` })}
                >
                  <img
                    src={url}
                    alt={`Carousel page ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      onClick={() => handleSaveImage(url, index)}
                      className="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-medium hover:bg-violet-600"
                    >
                      Download Page {index + 1}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                {post.visual_url && !imageError && (
                  <button
                    onClick={() => handleSaveImage()}
                    className="text-sm text-violet-400 hover:text-violet-300 px-3 py-1.5 rounded-lg border border-violet-500/30 hover:bg-violet-500/10"
                  >
                    Save Image
                  </button>
                )}
              </div>
              <div
                className="bg-white/5 rounded-xl flex items-center justify-center overflow-hidden cursor-zoom-in"
                style={{ aspectRatio: customAspect }}
                onClick={() => post.visual_url && !imageError && setFullScreenImage({ url: post.visual_url, alt: "Post visual" })}
              >
                {post.visual_url && !imageError ? (
                  <img
                    src={post.visual_url}
                    alt="Post visual"
                    className="w-full h-full object-cover rounded-lg"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <span className="text-zinc-500 text-sm">
                    {imageError ? "Image failed to load" : "Visual will be generated"}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="glass-elevated p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Caption</h2>
            <div className="flex gap-2">
              <button
                onClick={handleCopyCaption}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  copied
                    ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                    : "border-violet-500/30 text-violet-400 hover:text-violet-300 hover:bg-violet-500/10"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <Link
                href={`/create-post?edit=${post.id}`}
                className="text-sm text-violet-400 hover:text-violet-300 px-3 py-1.5 rounded-lg border border-violet-500/30 hover:bg-violet-500/10"
              >
                Edit & Regenerate
              </Link>
            </div>
          </div>

          <p className="text-sm text-zinc-400 mb-2">
            Full caption (edit and copy-paste directly to Instagram):
          </p>
          <textarea
            value={captionToParagraph(caption)}
            onChange={(e) => setCaption(paragraphToCaption(e.target.value))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 min-h-[200px]"
            rows={10}
            placeholder="Hook&#10;&#10;Body&#10;&#10;CTA&#10;&#10;#hashtag1 #hashtag2"
          />
        </div>
      </div>

      {!hasCarousel && draftData && "visualAdvice" in draftData && (
        <div className="glass-elevated p-6 rounded-2xl space-y-4">
          <h2 className="text-xl font-semibold text-white">Draft for Regeneration</h2>
          <p className="text-sm text-zinc-400">
            Edit these fields to change the image when you Regenerate.
          </p>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Visual Advice (for image generation)
            </label>
            <textarea
              value={draftData.visualAdvice ?? ""}
              onChange={(e) =>
                setDraftData((prev) =>
                  prev && "visualAdvice" in prev
                    ? { ...prev, visualAdvice: e.target.value }
                    : prev
                )
              }
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              rows={3}
              placeholder="Scene description for image generation..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Text on Image (plain text only)
            </label>
            <textarea
              value={draftData.imageTextOnImage ?? ""}
              onChange={(e) =>
                setDraftData((prev) =>
                  prev && "imageTextOnImage" in prev
                    ? { ...prev, imageTextOnImage: e.target.value }
                    : prev
                )
              }
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              rows={2}
              placeholder="Text to render on the image..."
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4">
        <button
          onClick={() => router.back()}
          className="flex-1 min-w-[120px] px-4 py-2 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => setShowSaveTemplate(true)}
          className="px-4 py-2 border border-violet-500/30 rounded-xl text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 transition-colors"
        >
          Save as Template
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 min-w-[120px] px-4 py-2 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Saving..." : "Save to Library"}
        </button>
      </div>

      {showSaveTemplate && (
        <SaveTemplateModal
          postId={post.id}
          onClose={() => setShowSaveTemplate(false)}
          onSaved={() => router.refresh()}
        />
      )}

      {fullScreenImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setFullScreenImage(null)}
        >
          <img
            src={fullScreenImage.url}
            alt={fullScreenImage.alt}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
