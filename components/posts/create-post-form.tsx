"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BrandSpace, PostType, PostFormat, PlanTier } from "@/types/database";
import { PLAN_LIMITS } from "@/types/database";

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

function EditorialIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="2" y="4" width="20" height="16" rx="1" strokeWidth={2} />
      <line x1="2" y1="10" x2="22" y2="10" strokeWidth={2} />
      <line x1="8" y1="14" x2="14" y2="14" strokeWidth={1.5} />
      <line x1="8" y1="17" x2="12" y2="17" strokeWidth={1.5} />
    </svg>
  );
}

function TextHeavyIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h12M4 18h10" />
    </svg>
  );
}

function ImmersivePhotoIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="1" strokeWidth={2} />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14l3-3 2 2 4-5 2 3" />
    </svg>
  );
}

function TweetCardIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function SplitScreenIcon() {
  return (
    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="2" y="4" width="9" height="16" rx="1" strokeWidth={2} />
      <rect x="13" y="4" width="9" height="16" rx="1" strokeWidth={2} />
      <line x1="12" y1="4" x2="12" y2="20" strokeWidth={1.5} strokeDasharray="2 2" />
    </svg>
  );
}

export function CreatePostForm({
  brandSpaces,
  userCredits,
  planTier,
}: CreatePostFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{
    imageTextOnImage: string;
    visualAdvice: string;
    igCaption: string;
  } | null>(null);
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
  });

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

  const creditsNeeded = formData.variations;
  const canGenerate = userCredits >= creditsNeeded;

  const handleGenerateDraft = async () => {
    setLoading(true);
    setDraft(null);
    const payload = {
      brandSpaceId: formData.brandSpaceId,
      postType: formData.postType,
      format: formData.format,
      language: effectiveLanguage,
      contentIdea: formData.contentIdea,
      contentFramework: formData.contentFramework,
      postStyle: formData.postStyle,
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
          setDraft({
            imageTextOnImage: data.imageTextOnImage ?? "",
            visualAdvice: data.visualAdvice ?? "",
            igCaption: data.igCaption ?? "",
          });
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
          contentFramework: formData.contentFramework,
          postStyle: formData.postStyle,
          confirmedImageTextOnImage: draft.imageTextOnImage,
          confirmedVisualAdvice: draft.visualAdvice,
          confirmedIgCaption: draft.igCaption,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || err.details || "Failed to generate post");
      }

      const data = await response.json();
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
    "bg-zinc-900/50 rounded-2xl border border-white/10 p-6 space-y-6 backdrop-blur-sm";

  const Stepper = () => (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                step >= s.id
                  ? "bg-gradient-to-br from-violet-500 to-cyan-500 text-white ring-2 ring-violet-500/50"
                  : "bg-zinc-800 text-zinc-500 border border-white/10"
              }`}
            >
              {s.id}
            </div>
            <span
              className={`mt-2 text-xs font-medium ${
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
              { value: "square", label: "Square", ratio: "1:1" },
              { value: "portrait", label: "Portrait", ratio: "4:5" },
              { value: "story", label: "Story", ratio: "9:16" },
              { value: "reel-cover", label: "Reel Cover", ratio: "9:16" },
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
                className={`p-4 rounded-xl border-2 transition-all ${
                  formData.format === format.value
                    ? "border-violet-500 bg-violet-500/10 text-zinc-100"
                    : "border-white/10 bg-zinc-800/30 text-zinc-400 hover:border-white/20"
                }`}
              >
                <div className="font-medium text-sm">{format.label}</div>
                <div className="text-xs text-zinc-500">{format.ratio}</div>
              </button>
            ))}
          </div>
        </div>

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
            onClick={() => setStep(2)}
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
      { value: "educational-value", label: "Educational / Value", zh: "教育/乾貨" },
      { value: "engagement-relatable", label: "Engagement / Relatable", zh: "互動/共鳴" },
      { value: "promotional-proof", label: "Promotional / Proof", zh: "宣傳/轉換" },
      { value: "storytelling", label: "Storytelling", zh: "品牌故事" },
    ];

    const VISUAL_LAYOUT_OPTIONS = [
      {
        value: "editorial",
        label: "Editorial",
        zh: "雜誌排版",
        icon: EditorialIcon,
      },
      {
        value: "text-heavy",
        label: "Text-Heavy",
        zh: "醒目大字",
        icon: TextHeavyIcon,
      },
      {
        value: "immersive-photo",
        label: "Immersive Photo",
        zh: "純圖/極簡文字",
        icon: ImmersivePhotoIcon,
      },
      {
        value: "tweet-card",
        label: "Tweet Card",
        zh: "推文/語錄",
        icon: TweetCardIcon,
      },
      {
        value: "split-screen",
        label: "Split Screen",
        zh: "圖文分割",
        icon: SplitScreenIcon,
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
            Content Framework (內容架構)
          </p>
          <p className="text-xs text-zinc-500 mb-3">
            Select the strategic goal of your post.
          </p>
          <div className="flex flex-wrap gap-2">
            {CONTENT_FRAMEWORK_OPTIONS.map(({ value, label, zh }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, contentFramework: value })
                }
                className={`px-4 py-2 text-sm rounded-xl border transition-all ${
                  formData.contentFramework === value
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                    : "border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-indigo-500/30 hover:bg-zinc-800/50"
                }`}
              >
                {label}{" "}
                <span className={formData.contentFramework === value ? "text-indigo-300/80" : "text-zinc-500"}>
                  ({zh})
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-800/30 border border-white/5">
          <p className="text-sm font-medium text-zinc-400 mb-3">
            Visual Layout (視覺排版)
          </p>
          <p className="text-xs text-zinc-500 mb-4">
            Choose the layout style for your post image.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {VISUAL_LAYOUT_OPTIONS.map(({ value, label, zh, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, postStyle: value })
                }
                className={`p-4 rounded-xl border-2 text-left transition-all flex flex-col items-start gap-3 hover:border-indigo-500/50 hover:bg-zinc-800/50 ${
                  formData.postStyle === value
                    ? "border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                    : "border-white/10 bg-zinc-800/20"
                }`}
              >
                <div className="w-10 h-10 flex items-center justify-center text-indigo-400/80">
                  <Icon />
                </div>
                <div>
                  <div className="font-medium text-zinc-100 text-sm">{label}</div>
                  <div className="text-xs text-zinc-500">{zh}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
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

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Number of Variations
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
            1 credit = 1 generated variation for one size
          </p>
        </div>

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

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => setStep(2)}
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

  if (step === 4 && !draft) {
    return (
      <div className={cardClass}>
        <Stepper />
        <p className="text-zinc-400">No draft yet. Please go back and generate a draft.</p>
        <button
          type="button"
          onClick={() => setStep(3)}
          className="mt-4 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
        >
          Back to Step 3
        </button>
      </div>
    );
  }

  if (step === 4 && draft) {
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
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Text on Image (可編輯) — Markdown for header/subheader/body
            </label>
            <p className="text-xs text-zinc-500 mb-1">
              {formData.postStyle === "immersive-photo"
                ? "Minimal or no text. Leave blank for pure image."
                : "Text that will be rendered on the image. Use ## for header, ### for subheader."}
            </p>
            <textarea
              value={draft.imageTextOnImage}
              onChange={(e) =>
                setDraft({ ...draft, imageTextOnImage: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
              rows={3}
              placeholder={formData.postStyle === "immersive-photo" ? "Leave blank for no text on image" : "## Headline\n### Subheader\nBody text..."}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              視覺建議 (Visual Advice for Image Generation)
            </label>
            <textarea
              value={draft.visualAdvice}
              onChange={(e) =>
                setDraft({ ...draft, visualAdvice: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
              rows={5}
              placeholder="AI-generated visual description for the image..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              IG Caption (可編輯) — Max 400 chars, max 3 hashtags
            </label>
            <textarea
              value={draft.igCaption}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  igCaption: e.target.value.slice(0, 400),
                })
              }
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
              rows={5}
              maxLength={400}
              placeholder="Full caption for Instagram post..."
            />
            <p className="text-xs text-zinc-500 mt-1">{draft.igCaption.length}/400</p>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => setStep(3)}
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
