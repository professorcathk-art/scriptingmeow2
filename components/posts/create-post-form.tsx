"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCredits } from "@/components/credits/credits-provider";
import { useRouter } from "next/navigation";
import type { BrandSpace, PostType, PostFormat, PlanTier } from "@/types/database";
import { PLAN_LIMITS } from "@/types/database";

const CREATE_POST_DRAFT_KEY = "createPost_draft";

interface CreatePostFormProps {
  brandSpaces: BrandSpace[];
  userCredits: number;
  planTier: PlanTier;
}

const STEPS = [
  { id: 1, label: "Select Brand" },
  { id: 2, label: "Content & Style" },
  { id: 3, label: "Review Draft" },
  { id: 4, label: "Generate Image" },
];

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function SquaresIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

export function CreatePostForm({
  brandSpaces,
  userCredits: initialCredits,
  planTier,
}: CreatePostFormProps) {
  const router = useRouter();
  const creditsCtx = useCredits();
  const userCredits = creditsCtx?.creditsRemaining ?? initialCredits;
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  type SingleDraft = { imageTextOnImage: string; visualAdvice: string; igCaption: string };
  type CarouselDraftItem = { pages: { pageIndex: number; header: string; imageTextOnImage: string; visualAdvice: string }[]; igCaption: string };
  const [draftVariations, setDraftVariations] = useState<(SingleDraft | CarouselDraftItem)[] | null>(null);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState<0 | 1>(0);
  const [formData, setFormData] = useState({
    brandSpaceId: "",
    postType: "single-image" as PostType,
    format: "square" as PostFormat,
    language: "English",
    customLanguage: "",
    contentIdea: "",
    contentFramework: "educational-value" as string,
    postStyle: "immersive-photo" as string,
    variations: 1,
    carouselPageCount: 3,
  });
  const [referenceImages, setReferenceImages] = useState<{ id: string; image_url: string }[]>([]);
  const [selectedSampleUrls, setSelectedSampleUrls] = useState<string[]>([]);
  const [sampleUploading, setSampleUploading] = useState(false);
  const [carouselPages, setCarouselPages] = useState<
    { pageIndex: number; header: string; imageTextOnImage: string; visualAdvice: string }[]
  >([]);

  const saveDraft = useCallback(() => {
    try {
      sessionStorage.setItem(
        CREATE_POST_DRAFT_KEY,
        JSON.stringify({
          formData,
          step,
          draftVariations,
          selectedDraftIndex,
          carouselPages,
          selectedSampleUrls,
        })
      );
    } catch {
      // ignore
    }
  }, [formData, step, draftVariations, selectedDraftIndex, carouselPages, selectedSampleUrls]);

  const saveDraftAndSetStep = useCallback(
    (nextStep: 1 | 2 | 3 | 4) => {
      saveDraft();
      setStep(nextStep);
    },
    [saveDraft]
  );

  const clearPostDraft = useCallback(() => {
    try {
      sessionStorage.removeItem(CREATE_POST_DRAFT_KEY);
    } catch {
      // ignore
    }
  }, []);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      saveDraft();
    }
  }, [saveDraft]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CREATE_POST_DRAFT_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data?.formData && typeof data?.step === "number" && data.step >= 1 && data.step <= 4) {
          setFormData((prev) => ({ ...prev, ...data.formData }));
          setStep(data.step);
          if (data.draftVariations?.length) setDraftVariations(data.draftVariations);
          if (typeof data.selectedDraftIndex === "number") setSelectedDraftIndex(data.selectedDraftIndex as 0 | 1);
          if (Array.isArray(data.carouselPages)) setCarouselPages(data.carouselPages);
          if (Array.isArray(data.selectedSampleUrls)) setSelectedSampleUrls(data.selectedSampleUrls);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchReferenceImages = useCallback(() => {
    if (!formData.brandSpaceId) return;
    fetch(`/api/brand-spaces/${formData.brandSpaceId}/images`)
      .then((r) => r.json())
      .then((data) => setReferenceImages(data.images ?? []))
      .catch(() => setReferenceImages([]));
  }, [formData.brandSpaceId]);

  useEffect(() => {
    if (step === 4 && formData.brandSpaceId) {
      fetchReferenceImages();
      setSelectedSampleUrls([]);
    }
  }, [step, formData.brandSpaceId, fetchReferenceImages]);

  const handleUploadSamplePhotos = async (files: FileList | null) => {
    if (!files || files.length === 0 || !formData.brandSpaceId) return;
    setSampleUploading(true);
    try {
      const fd = new FormData();
      Array.from(files)
        .slice(0, 10)
        .forEach((file) => fd.append("files", file));
      const res = await fetch(`/api/brand-spaces/${formData.brandSpaceId}/images`, {
        method: "POST",
        body: fd,
      });
      if (res.ok) fetchReferenceImages();
      else alert("Upload failed. Ensure Storage bucket exists.");
    } catch {
      alert("Upload failed. Ensure Storage bucket exists.");
    } finally {
      setSampleUploading(false);
    }
  };

  const LANGUAGE_OPTIONS = [
    "English",
    "Traditional Chinese",
    "Simplified Chinese",
    "Spanish",
    "French",
    "German",
    "Japanese",
    "Korean",
    "Portuguese",
    "Italian",
    "Dutch",
    "Bilingual (English + Chinese)",
    "Other",
  ];

  const effectiveLanguage =
    formData.language === "Other" && formData.customLanguage.trim()
      ? formData.customLanguage.trim()
      : formData.language;

  const creditsNeeded =
    formData.postType === "carousel"
      ? formData.carouselPageCount
      : formData.variations;
  const canGenerate = userCredits >= creditsNeeded;

  const handleGenerateDraft = async () => {
    setLoading(true);
    setDraftVariations(null);
    const payload = {
      brandSpaceId: formData.brandSpaceId,
      postType: formData.postType,
      format: formData.format,
      language: effectiveLanguage,
      contentIdea: formData.contentIdea,
      contentFramework: formData.contentFramework,
      postStyle: formData.postStyle,
      carouselPageCount: formData.postType === "carousel" ? formData.carouselPageCount : undefined,
    };
    const DRAFT_TIMEOUT_MS = 55000;
    const doFetch = () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DRAFT_TIMEOUT_MS);
      return fetch("/api/posts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeout));
    };
    let lastError: Error | null = null;
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await doFetch();

          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            const msg = err.details || err.error || "Failed to generate draft";
            throw new Error(msg);
          }

          const data = await response.json();
          const vars = data.variations ?? [];
          const isCarouselDraft = vars[0]?.pages != null;
          if (isCarouselDraft && vars.length >= 1) {
            setDraftVariations(vars);
            setSelectedDraftIndex(0);
            setCarouselPages(vars[0].pages ?? []);
          } else if (vars.length >= 2) {
            setDraftVariations(vars);
            setSelectedDraftIndex(0);
          } else if (vars.length === 1) {
            setDraftVariations([vars[0], vars[0]]);
            setSelectedDraftIndex(0);
          } else {
            const single = {
              imageTextOnImage: data.imageTextOnImage ?? "",
              visualAdvice: data.visualAdvice ?? "",
              igCaption: data.igCaption ?? "",
            };
            setDraftVariations([single, single]);
            setSelectedDraftIndex(0);
          }
          setStep(4);
          return;
        } catch (error: unknown) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const isNetworkError =
            lastError.message === "Failed to fetch" ||
            lastError.message.includes("ERR_CONNECTION") ||
            lastError.message.includes("NetworkError") ||
            lastError.message === "The operation was aborted." ||
            lastError.name === "AbortError";
          if (isNetworkError && attempt === 0) {
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          break;
        }
      }
      const msg =
        lastError?.message === "Failed to fetch" ||
        lastError?.message?.includes("ERR_CONNECTION") ||
        lastError?.message === "The operation was aborted." ||
        lastError?.name === "AbortError"
          ? "Request timed out or connection failed. Try a shorter description (under 400 chars) and try again."
          : lastError?.message || "Failed to generate draft. Please try again.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndGenerate = async () => {
    const draft = draftVariations?.[selectedDraftIndex];
    const isCarousel = formData.postType === "carousel";
    if (!draft || !canGenerate) {
      alert("Not enough credits or no draft. Please upgrade your plan or regenerate.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSpaceId: formData.brandSpaceId,
          postType: formData.postType,
          format: formData.format,
          language: effectiveLanguage,
          contentIdea: formData.contentIdea,
          variations: formData.variations,
          carouselPageCount: formData.postType === "carousel" ? formData.carouselPageCount : undefined,
          contentFramework: formData.contentFramework,
          postStyle: formData.postStyle,
          confirmedImageTextOnImage: isCarousel ? undefined : (draft as { imageTextOnImage?: string }).imageTextOnImage,
          confirmedVisualAdvice: isCarousel ? undefined : (draft as { visualAdvice?: string }).visualAdvice,
          confirmedIgCaption: draft.igCaption,
          carouselPages:
            formData.postType === "carousel"
              ? carouselPages.length > 0
                ? carouselPages
                : (draftVariations?.[selectedDraftIndex] as { pages?: { pageIndex: number; header: string; imageTextOnImage: string; visualAdvice: string }[] })?.pages
              : undefined,
          selectedSampleImageUrls: selectedSampleUrls,
        }),
      });

      if (!response.ok) {
        let errMsg = "Failed to generate post";
        try {
          const err = await response.json();
          errMsg = err.error || err.details || errMsg;
        } catch {
          errMsg =
            response.status === 504 || response.status === 502
              ? "Request timed out. Carousel generation takes longer—try fewer pages or try again."
              : `Request failed (${response.status})`;
        }
        throw new Error(errMsg);
      }

      let data: { id: string; credits_remaining?: number };
      try {
        data = await response.json();
      } catch {
        throw new Error("Invalid response from server. Please try again.");
      }
      if (typeof data.credits_remaining === "number") {
        creditsCtx?.setCredits(data.credits_remaining);
      }
      clearPostDraft();
      router.refresh();
      router.push(`/posts/${data.id}/review`);
    } catch (error: unknown) {
      console.error("Error generating post:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate post. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const cardClass =
    "bg-zinc-900/50 rounded-xl sm:rounded-2xl border border-white/10 p-4 sm:p-6 space-y-4 sm:space-y-6 backdrop-blur-sm";

  const Stepper = () => (
    <div className="flex items-center justify-between mb-4 sm:mb-8 overflow-x-auto">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-semibold transition-all shrink-0 ${
                step >= s.id
                  ? "bg-gradient-to-br from-violet-500 to-cyan-500 text-white ring-2 ring-violet-500/50"
                  : "bg-zinc-800 text-zinc-500 border border-white/10"
              }`}
            >
              {s.id}
            </div>
            <span
              className={`mt-1 sm:mt-2 text-[10px] sm:text-xs font-medium whitespace-nowrap ${
                step >= s.id ? "text-zinc-100" : "text-zinc-500"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`flex-1 h-0.5 mx-2 ${
                step > s.id ? "bg-violet-500/50" : "bg-white/10"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  if (step === 1) {
    return (
      <div className={cardClass}>
        <Stepper />
        <h2 className="text-xl font-semibold text-zinc-100">
          Step 1: Select Brand & Post Type
        </h2>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Brand Space *
          </label>
          <select
            required
            value={formData.brandSpaceId}
            onChange={(e) =>
              setFormData({ ...formData, brandSpaceId: e.target.value })
            }
            className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
          >
            <option value="">Select a brand space</option>
            {brandSpaces.map((space) => (
              <option key={space.id} value={space.id}>
                {space.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-3">
            Post Type *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, postType: "single-image" })
              }
              className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col items-start gap-3 ${
                formData.postType === "single-image"
                  ? "border-violet-500 bg-violet-500/10 shadow-[0_0_30px_-5px_rgba(139,92,246,0.4)]"
                  : "border-white/10 bg-zinc-800/30 hover:border-white/20"
              }`}
            >
              <ImageIcon
                className={`w-10 h-10 ${
                  formData.postType === "single-image"
                    ? "text-violet-400"
                    : "text-zinc-500"
                }`}
              />
              <div>
                <div className="font-semibold text-zinc-100">Single Image</div>
                <div className="text-sm text-zinc-400">One image post</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, postType: "carousel" })}
              className={`p-6 rounded-2xl border-2 text-left transition-all flex flex-col items-start gap-3 ${
                formData.postType === "carousel"
                  ? "border-violet-500 bg-violet-500/10 shadow-[0_0_30px_-5px_rgba(139,92,246,0.4)]"
                  : "border-white/10 bg-zinc-800/30 hover:border-white/20"
              }`}
            >
              <SquaresIcon
                className={`w-10 h-10 ${
                  formData.postType === "carousel"
                    ? "text-violet-400"
                    : "text-zinc-500"
                }`}
              />
              <div>
                <div className="font-semibold text-zinc-100">Carousel</div>
                <div className="text-sm text-zinc-400">Multi-image post</div>
              </div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-3">
            Format *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "square", label: "Square", ratio: "1:1", hint: "Most common for feed" },
              { value: "portrait", label: "Portrait", ratio: "4:5", hint: "Recommended for feed" },
              { value: "story", label: "Story", ratio: "9:16", hint: "Stories / Reels" },
              { value: "reel-cover", label: "Reel Cover", ratio: "9:16", hint: "Stories / Reels" },
            ].map((format) => (
              <button
                key={format.value}
                type="button"
                onClick={() =>
                  setFormData({
                    ...formData,
                    format: format.value as PostFormat,
                  })
                }
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  formData.format === format.value
                    ? "border-violet-500 bg-violet-500/10 text-zinc-100"
                    : "border-white/10 bg-zinc-800/30 text-zinc-400 hover:border-white/20"
                }`}
              >
                <div className="font-medium text-sm">{format.label}</div>
                <div className="text-xs text-zinc-500">{format.ratio}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{format.hint}</div>
              </button>
            ))}
          </div>
        </div>

        {formData.postType === "carousel" && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Number of pages (1–9)
            </label>
            <select
              value={formData.carouselPageCount}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  carouselPageCount: parseInt(e.target.value, 10),
                })
              }
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "page" : "pages"}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => saveDraftAndSetStep(2)}
            disabled={!formData.brandSpaceId}
            className="flex-1 px-4 py-2.5 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            Next: Content
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    const CONTENT_FRAMEWORK_OPTIONS = [
      {
        value: "educational-value",
        title: "Educational / Value",
        description: "Share tips, tutorials, or actionable advice to teach your audience.",
      },
      {
        value: "engagement-relatable",
        title: "Engagement / Relatable",
        description: "Spark conversations with memes, relatable situations, or questions.",
      },
      {
        value: "promotional-proof",
        title: "Promotional / Proof",
        description: "Highlight your products/services, share testimonials, or announce sales.",
      },
      {
        value: "storytelling",
        title: "Storytelling / Behind the Scenes",
        description: "Build connection by sharing your journey, team, or processes.",
      },
    ];

    const VISUAL_LAYOUT_OPTIONS = [
      {
        value: "editorial",
        title: "Minimalist Editorial",
        description: "Clean, magazine-like design with plenty of white space and elegant typography.",
      },
      {
        value: "text-heavy",
        title: "Text-Heavy / Carousel",
        description: "Bold, easy-to-read typography taking center stage, perfect for step-by-step guides.",
      },
      {
        value: "immersive-photo",
        title: "Immersive Visual",
        description: "Focuses entirely on high-quality photography or graphics with minimal text overlay.",
      },
      {
        value: "tweet-card",
        title: "Tweet / Quote Card",
        description: "A stylized social media post or quote placed on an attractive background.",
      },
      {
        value: "split-screen",
        title: "Split Screen / Collage",
        description: "Dynamic mix of multiple images or a side-by-side comparison with text areas.",
      },
    ];

    return (
      <div className={cardClass}>
        <Stepper />
        <h2 className="text-xl font-semibold text-zinc-100">
          Step 2: Content & Language
        </h2>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Language *
          </label>
          <select
            required={formData.language !== "Other"}
            value={formData.language}
            onChange={(e) =>
              setFormData({ ...formData, language: e.target.value })
            }
            className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          {formData.language === "Other" && (
            <input
              type="text"
              required
              value={formData.customLanguage}
              onChange={(e) =>
                setFormData({ ...formData, customLanguage: e.target.value })
              }
              placeholder="Enter your language"
              className="mt-2 w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Describe the post you want to create * (max 500 chars for faster generation)
          </label>
          <textarea
            required
            maxLength={500}
            value={formData.contentIdea}
            onChange={(e) =>
              setFormData({ ...formData, contentIdea: e.target.value })
            }
            className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            rows={5}
            placeholder="e.g., Announce our new product launch, share a customer testimonial..."
          />
          <p className="text-xs text-zinc-500 mt-1">
            {formData.contentIdea.length}/500
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-800/30 border border-white/5">
          <p className="text-sm font-medium text-zinc-400 mb-3">
            Content Framework
          </p>
          <p className="text-xs text-zinc-500 mb-4">
            Select the strategic goal of your post.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CONTENT_FRAMEWORK_OPTIONS.map(({ value, title, description }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, contentFramework: value })
                }
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  formData.contentFramework === value
                    ? "border-indigo-500 bg-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                    : "border-white/10 hover:border-indigo-500/30 hover:bg-zinc-800/50"
                }`}
              >
                <div className="font-medium text-zinc-100 mb-1">{title}</div>
                <div className="text-sm text-zinc-500">{description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-800/30 border border-white/5">
          <p className="text-sm font-medium text-zinc-400 mb-3">
            Visual Layout
          </p>
          <p className="text-xs text-zinc-500 mb-4">
            Choose the layout style for your post image.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {VISUAL_LAYOUT_OPTIONS.map(({ value, title, description }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, postStyle: value })
                }
                className={`p-4 rounded-xl border-2 text-left transition-all hover:border-indigo-500/50 hover:bg-zinc-800/50 ${
                  formData.postStyle === value
                    ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    : "border-white/10 bg-zinc-800/20"
                }`}
              >
                <div className="font-semibold text-zinc-100 mb-2">{title}</div>
                <p className="text-sm text-zinc-500">{description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => saveDraftAndSetStep(1)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => saveDraftAndSetStep(3)}
            disabled={
              !formData.contentIdea ||
              (formData.language === "Other" && !formData.customLanguage.trim())
            }
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            Next: Generate Draft
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className={cardClass}>
        <Stepper />
        <h2 className="text-xl font-semibold text-zinc-100">
          Step 3: Generate Draft (Caption + 視覺建議)
        </h2>
        <p className="text-sm text-zinc-400">
          AI will generate the post caption and visual advice. Review and confirm before generating the image.
        </p>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => saveDraftAndSetStep(2)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleGenerateDraft}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? "Generating draft..." : "Generate Draft"}
          </button>
        </div>
      </div>
    );
  }

  if (step === 4 && !draftVariations?.length) {
    return (
      <div className={cardClass}>
        <Stepper />
        <p className="text-zinc-400">No draft yet. Please go back and generate a draft.</p>
        <button
          type="button"
          onClick={() => saveDraftAndSetStep(3)}
          className="mt-4 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
        >
          Back to Step 3
        </button>
      </div>
    );
  }

  if (step === 4 && draftVariations?.length) {
    const draft = draftVariations[selectedDraftIndex];
    const isCarouselDraft = "pages" in draft;
    const carouselDraft = isCarouselDraft ? (draft as CarouselDraftItem) : null;
    const setDraftField = (field: "imageTextOnImage" | "visualAdvice" | "igCaption", value: string) => {
      setDraftVariations((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[selectedDraftIndex] = { ...next[selectedDraftIndex], [field]: value };
        return next;
      });
    };
    const setCarouselPageField = (
      pageIndex: number,
      field: "header" | "imageTextOnImage" | "visualAdvice",
      value: string
    ) => {
      setCarouselPages((prev) =>
        prev.map((p) =>
          p.pageIndex === pageIndex ? { ...p, [field]: value } : p
        )
      );
    };
    return (
      <div className={cardClass}>
        <Stepper />
        <h2 className="text-xl font-semibold text-zinc-100">
          Step 4: Confirm & Generate Image
        </h2>
        <p className="text-sm text-zinc-400 mb-4">
          Review the caption and visual advice. Edit if needed, then confirm to generate the image.
        </p>

        <div className="space-y-4">
          {!isCarouselDraft && draftVariations.length >= 2 && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Choose a draft variation
              </label>
              <div className="grid grid-cols-2 gap-3">
                {draftVariations.map((v, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedDraftIndex(i as 0 | 1)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedDraftIndex === i
                        ? "border-violet-500 bg-violet-500/10"
                        : "border-white/10 bg-zinc-800/30 hover:border-white/20"
                    }`}
                  >
                    <span className="text-xs font-medium text-zinc-500">Variation {i + 1}</span>
                    <p className="mt-2 text-sm text-zinc-200 line-clamp-3">
                      {"pages" in v ? `Carousel (${v.pages.length} pages)` : v.imageTextOnImage || v.igCaption || "—"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {isCarouselDraft ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-400">
                Edit each page&apos;s content. Each page will become one image in the carousel.
              </p>
              {carouselPages.map((page) => (
                <div
                  key={page.pageIndex}
                  className="p-4 rounded-xl bg-zinc-800/30 border border-white/10 space-y-3"
                >
                  <div className="font-medium text-zinc-200">
                    Page {page.pageIndex}: {page.header}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Main Headline 主標題 (content headline on image)
                    </label>
                    <input
                      type="text"
                      value={page.header}
                      onChange={(e) =>
                        setCarouselPageField(page.pageIndex, "header", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
                      placeholder="e.g. 5 Mistakes That Kill Your Growth"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Text on Image (plain text only)
                    </label>
                    <textarea
                      value={page.imageTextOnImage}
                      onChange={(e) =>
                        setCarouselPageField(page.pageIndex, "imageTextOnImage", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
                      rows={2}
                      placeholder="Text to render on this page"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">
                      Visual Advice (for image generation)
                    </label>
                    <textarea
                      value={page.visualAdvice}
                      onChange={(e) =>
                        setCarouselPageField(page.pageIndex, "visualAdvice", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
                      rows={3}
                      placeholder="Visual description for this page"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Text on Image (可編輯) — Plain text only, no markdown
            </label>
            <p className="text-xs text-zinc-500 mb-1">
              {formData.postStyle === "immersive-photo"
                ? "Minimal or no text. Leave blank for pure image."
                : formData.postStyle === "editorial"
                  ? "Line 1 = headline, Line 2 = subheadline, Line 3+ = body. Plain text only (no #, ##, ###)."
                  : "Text to render on the image. Plain text only, no markdown."}
            </p>
            <textarea
              value={draft.imageTextOnImage}
              onChange={(e) =>
                setDraftField("imageTextOnImage", e.target.value)
              }
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
              rows={4}
              placeholder={formData.postStyle === "immersive-photo" ? "Leave blank for no text on image" : "Headline\nSubheadline\nBody text..."}
            />
          </div>
          )}

          {!isCarouselDraft && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              視覺建議 (Visual Advice for Image Generation)
            </label>
            <textarea
              value={draft.visualAdvice}
              onChange={(e) =>
                setDraftField("visualAdvice", e.target.value)
              }
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
              rows={5}
              placeholder="AI-generated visual description for the image..."
            />
          </div>
          )}

          {formData.brandSpaceId && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                Sample Photos (optional, up to 5) — Style reference for image generation
              </label>
              <div className="flex flex-wrap gap-3 items-center">
                {referenceImages.map((img) => {
                  const isSelected = selectedSampleUrls.includes(img.image_url);
                  const canSelect = isSelected || selectedSampleUrls.length < 5;
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => {
                        if (!canSelect) return;
                        setSelectedSampleUrls((prev) =>
                          isSelected
                            ? prev.filter((u) => u !== img.image_url)
                            : [...prev, img.image_url].slice(0, 5)
                        );
                      }}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        isSelected
                          ? "border-violet-500 ring-2 ring-violet-500/50"
                          : canSelect
                            ? "border-white/10 hover:border-violet-500/50"
                            : "border-white/10 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <img
                        src={img.image_url}
                        alt="Sample"
                        className="w-full h-full object-cover"
                      />
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center cursor-pointer hover:border-violet-500/50 hover:bg-white/5 transition-all shrink-0">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleUploadSamplePhotos(e.target.files)}
                    disabled={sampleUploading}
                  />
                  {sampleUploading ? (
                    <span className="text-zinc-500 text-xs">...</span>
                  ) : (
                    <span className="text-2xl text-zinc-500">+</span>
                  )}
                </label>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {selectedSampleUrls.length}/5 selected. Click + to add more photos.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              IG Caption (可編輯) — Max 400 chars, max 3 hashtags
            </label>
            <textarea
              value={carouselDraft ? carouselDraft.igCaption : (draft as SingleDraft).igCaption}
              onChange={(e) => {
                const v = e.target.value.slice(0, 400);
                if (isCarouselDraft) {
                  setDraftVariations((prev) => {
                    if (!prev) return prev;
                    const next = [...prev];
                    const curr = next[selectedDraftIndex] as CarouselDraftItem;
                    next[selectedDraftIndex] = { ...curr, igCaption: v };
                    return next;
                  });
                } else {
                  setDraftField("igCaption", v);
                }
              }}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
              rows={5}
              maxLength={400}
              placeholder="Full caption for Instagram post..."
            />
            <p className="text-xs text-zinc-500 mt-1">
              {(carouselDraft ? carouselDraft.igCaption : (draft as SingleDraft).igCaption).length}/400
            </p>
          </div>

          {!isCarouselDraft && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Number of Image Variations
            </label>
            <select
              value={formData.variations}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  variations: parseInt(e.target.value),
                })
              }
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              <option value={1}>1 variation</option>
              <option value={3}>3 variations</option>
              <option value={5}>5 variations</option>
            </select>
            <p className="text-sm text-zinc-500 mt-1">
              1 credit = 1 generated image. Draft generation does not consume credits.
            </p>
          </div>
          )}

          <div className="p-4 rounded-xl bg-zinc-800/30 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-400">
                Credits Needed:
              </span>
              <span className="text-lg font-bold text-zinc-100">
                {creditsNeeded} credits
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-400">Your Credits:</span>
              <span
                className={`text-sm font-medium ${
                  canGenerate ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {userCredits} / {PLAN_LIMITS[planTier].monthly_credits}
              </span>
            </div>
            {!canGenerate && (
              <p className="text-sm text-red-400 mt-2">
                Not enough credits.{" "}
                <a href="/billing" className="underline text-violet-400">
                  Upgrade your plan
                </a>
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => saveDraftAndSetStep(3)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirmAndGenerate}
            disabled={loading || !canGenerate}
            className="flex-1 px-4 py-2.5 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {loading ? "Generating image..." : "Confirm & Generate Image"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
