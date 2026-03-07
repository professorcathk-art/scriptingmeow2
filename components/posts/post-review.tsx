"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { GeneratedPost, DraftData } from "@/types/database";
import { SaveTemplateModal } from "./save-template-modal";
import { InstagramHandleForm } from "@/components/billing/instagram-handle-form";
import { useCredits } from "@/components/credits/credits-provider";

interface RefinementVersion {
  id: string;
  version_index: number;
  previous_visual_url?: string;
  previous_carousel_urls?: string[];
  visual_url?: string;
  carousel_urls?: string[];
  refined_page_index?: number;
  comment?: string;
  created_at: string;
}

interface PostReviewProps {
  post: GeneratedPost & { brand_spaces?: { name: string }; format?: string; is_public_gallery?: boolean };
  userCredits?: number;
  instagramHandle?: string | null;
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

export function PostReview({ post: initialPost, userCredits: initialCredits = 0, instagramHandle }: PostReviewProps) {
  const router = useRouter();
  const creditsCtx = useCredits();
  const userCredits = creditsCtx?.creditsRemaining ?? initialCredits;

  const [post, setPost] = useState(initialPost);
  const [caption, setCaption] = useState(initialPost.caption);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refinementHistory, setRefinementHistory] = useState<RefinementVersion[]>([]);
  const [refineComment, setRefineComment] = useState("");
  const [refinedPageIndex, setRefinedPageIndex] = useState(0);
  const [refining, setRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [isPublicGallery, setIsPublicGallery] = useState<boolean>(
    (initialPost as { is_public_gallery?: boolean }).is_public_gallery ?? false
  );
  const [draftData, setDraftData] = useState<DraftData | null>(() => {
    const d = (initialPost as { draft_data?: DraftData }).draft_data;
    if (d && "visualAdvice" in d && "imageTextOnImage" in d) return d;
    return null;
  });

  const fetchRefinementHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${initialPost.id}/refinement-history`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.history)) {
        setRefinementHistory(data.history);
      }
    } catch {
      setRefinementHistory([]);
    }
  }, [initialPost.id]);

  useEffect(() => {
    setPost(initialPost);
    setCaption(initialPost.caption);
    setIsPublicGallery((initialPost as { is_public_gallery?: boolean }).is_public_gallery ?? false);
    const d = (initialPost as { draft_data?: DraftData }).draft_data;
    if (d && "visualAdvice" in d && "imageTextOnImage" in d) setDraftData(d);
  }, [initialPost]);

  useEffect(() => {
    fetchRefinementHistory();
  }, [fetchRefinementHistory]);

  const savePost = useCallback(async () => {
    const payload: { caption: CaptionShape; status: string; draft_data?: DraftData; is_public_gallery?: boolean } = {
      caption,
      status: "saved",
      is_public_gallery: isPublicGallery,
    };
    if (draftData) payload.draft_data = draftData;
    const response = await fetch(`/api/posts/${post.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Failed to save post");
  }, [post.id, caption, isPublicGallery, draftData]);

  useEffect(() => {
    const t = setTimeout(() => savePost().catch(() => {}), 800);
    return () => clearTimeout(t);
  }, [caption, isPublicGallery, savePost]);


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

  const handleRefine = async () => {
    if (!refineComment.trim()) return;
    if (userCredits < 1) {
      setRefineError("Not enough credits");
      return;
    }
    setRefining(true);
    setRefineError(null);
    try {
      const res = await fetch(`/api/posts/${post.id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment: refineComment.trim(),
          refinedPageIndex: (post.carousel_urls ?? []).length > 0 ? refinedPageIndex : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Refinement failed");
      setPost((prev) => ({
        ...prev,
        visual_url: data.visual_url ?? prev.visual_url,
        carousel_urls: data.carousel_urls ?? prev.carousel_urls,
      }));
      setRefineComment("");
      fetchRefinementHistory();
      if (typeof data.credits_remaining === "number") {
        creditsCtx?.setCredits(data.credits_remaining);
      }
    } catch (e) {
      setRefineError(e instanceof Error ? e.message : "Refinement failed");
    } finally {
      setRefining(false);
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

      <div className="glass-elevated p-6 rounded-2xl space-y-4">
        <h2 className="text-xl font-semibold text-white">Refine with AI (1 credit)</h2>
        <p className="text-sm text-zinc-400">
          Comment on the visual to refine it. For carousels, select which page to refine.
        </p>
        {hasCarousel && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Page to refine</label>
            <select
              value={refinedPageIndex}
              onChange={(e) => setRefinedPageIndex(Number(e.target.value))}
              className="w-full max-w-xs px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-zinc-100"
            >
              {carouselUrls.map((_, i) => (
                <option key={i} value={i}>
                  Page {i + 1}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Your feedback</label>
          <textarea
            value={refineComment}
            onChange={(e) => setRefineComment(e.target.value)}
            placeholder="e.g. Make the text larger, add more contrast, change the background..."
            rows={4}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-y min-h-[100px]"
          />
          <button
            type="button"
            onClick={handleRefine}
            disabled={refining || !refineComment.trim() || userCredits < 1}
            className="mt-2 px-4 py-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 disabled:opacity-50"
          >
            {refining ? "Refining…" : "Refine (1 credit)"}
          </button>
          {refineError && <p className="mt-2 text-red-400 text-sm">{refineError}</p>}
        </div>
      </div>

      {(post.visual_url || carouselUrls.length > 0) && (
        <div className="glass-elevated p-6 rounded-2xl space-y-4">
          <h2 className="text-xl font-semibold text-white">Version history</h2>
          <p className="text-sm text-zinc-400">All versions of this post</p>
          <div className="space-y-6">
            {refinementHistory.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-zinc-300">Current</p>
                <div className={`flex gap-2 ${hasCarousel ? "flex-wrap" : ""}`}>
                  {hasCarousel ? (
                    carouselUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative bg-white/5 rounded-xl overflow-hidden cursor-zoom-in border-2 border-violet-500/50 flex-shrink-0"
                        style={{ aspectRatio: customAspect, width: hasCarousel ? 120 : "auto", minWidth: 80 }}
                        onClick={() => setFullScreenImage({ url, alt: `Current page ${idx + 1}` })}
                      >
                        <img src={url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-violet-500/80 px-2 py-1 text-xs text-white font-medium">
                          Page {idx + 1}
                        </div>
                      </div>
                    ))
                  ) : (
                    post.visual_url && (
                      <div
                        className="relative bg-white/5 rounded-xl overflow-hidden cursor-zoom-in border-2 border-violet-500/50"
                        style={{ aspectRatio: customAspect, width: 120 }}
                        onClick={() => setFullScreenImage({ url: post.visual_url!, alt: "Current" })}
                      >
                        <img src={post.visual_url} alt="Current" className="w-full h-full object-cover" />
                        <div className="absolute bottom-0 left-0 right-0 bg-violet-500/80 px-2 py-1 text-xs text-white font-medium">
                          Current
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
            {refinementHistory.length > 0 && (
              <>
                {!hasCarousel && refinementHistory[0]?.previous_visual_url && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-zinc-300">Original</p>
                    <div
                      className="relative bg-white/5 rounded-xl overflow-hidden cursor-zoom-in w-[120px]"
                      style={{ aspectRatio: customAspect }}
                      onClick={() =>
                        setFullScreenImage({ url: refinementHistory[0].previous_visual_url!, alt: "Original" })
                      }
                    >
                      <img src={refinementHistory[0].previous_visual_url} alt="Original" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
                {hasCarousel && refinementHistory[0]?.previous_carousel_urls && refinementHistory[0].previous_carousel_urls.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-zinc-300">Original</p>
                    <div className="flex gap-2 flex-wrap">
                      {refinementHistory[0].previous_carousel_urls.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative bg-white/5 rounded-xl overflow-hidden cursor-zoom-in flex-shrink-0"
                          style={{ aspectRatio: customAspect, width: 120 }}
                          onClick={() => setFullScreenImage({ url, alt: `Original page ${idx + 1}` })}
                        >
                          <img src={url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white">
                            Page {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {refinementHistory.map((v, i) => {
                  const urls = hasCarousel ? (v.carousel_urls ?? []) : (v.visual_url ? [v.visual_url] : []);
                  if (urls.length === 0) return null;
                  return (
                    <div key={v.id} className="space-y-2">
                      <p className="text-sm font-medium text-zinc-300">
                        v{i + 1}: {v.comment?.slice(0, 40) ?? "Refined"}
                      </p>
                      <div className={`flex gap-2 ${urls.length > 1 ? "flex-wrap" : ""}`}>
                        {urls.map((url, idx) => (
                          <div
                            key={idx}
                            className="relative bg-white/5 rounded-xl overflow-hidden cursor-zoom-in flex-shrink-0"
                            style={{ aspectRatio: customAspect, width: urls.length > 1 ? 120 : 120 }}
                            onClick={() => setFullScreenImage({ url, alt: `Version ${i + 1} page ${idx + 1}` })}
                          >
                            <img src={url} alt={`v${i + 1} page ${idx + 1}`} className="w-full h-full object-cover" />
                            {urls.length > 1 && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white">
                                Page {idx + 1}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-300">Current</p>
                  <div className={`flex gap-2 ${hasCarousel ? "flex-wrap" : ""}`}>
                    {hasCarousel ? (
                      carouselUrls.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative bg-white/5 rounded-xl overflow-hidden cursor-zoom-in border-2 border-violet-500/50 flex-shrink-0"
                          style={{ aspectRatio: customAspect, width: 120 }}
                          onClick={() => setFullScreenImage({ url, alt: `Current page ${idx + 1}` })}
                        >
                          <img src={url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-violet-500/80 px-2 py-1 text-xs text-white font-medium">
                            Page {idx + 1}
                          </div>
                        </div>
                      ))
                    ) : (
                      post.visual_url && (
                        <div
                          className="relative bg-white/5 rounded-xl overflow-hidden cursor-zoom-in border-2 border-violet-500/50"
                          style={{ aspectRatio: customAspect, width: 120 }}
                          onClick={() => setFullScreenImage({ url: post.visual_url!, alt: "Current" })}
                        >
                          <img src={post.visual_url} alt="Current" className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-violet-500/80 px-2 py-1 text-xs text-white font-medium">
                            Current
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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

      <div className="glass-elevated p-6 rounded-2xl space-y-4">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="public-gallery"
            checked={isPublicGallery}
            onChange={(e) => setIsPublicGallery(e.target.checked)}
            className="mt-1.5 w-5 h-5 rounded border-white/20 bg-white/5 text-violet-500 focus:ring-violet-500/50 cursor-pointer"
          />
          <div className="flex-1">
            <label htmlFor="public-gallery" className="block text-base font-medium text-zinc-100 cursor-pointer">
              Publish to public Discover Gallery
            </label>
            <p className="text-sm text-zinc-400 mt-1">
              Share this design to inspire others. We&apos;ll link directly to your Instagram{" "}
              {instagramHandle ? (
                <span className="text-violet-400">@{instagramHandle}</span>
              ) : (
                <span className="text-zinc-500">— set your handle below</span>
              )}
            </p>
          </div>
        </div>
        <InstagramHandleForm initialHandle={instagramHandle ?? ""} onSaved={() => router.refresh()} />
      </div>

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
