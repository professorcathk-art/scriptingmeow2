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

export function CreatePostForm({
  brandSpaces,
  userCredits,
  planTier,
}: CreatePostFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<{
    caption: { hook: string; body: string; cta: string; hashtags: string[] };
    visualAdvice: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    brandSpaceId: "",
    postType: "single-image" as PostType,
    format: "square" as PostFormat,
    language: "English",
    customLanguage: "",
    contentIdea: "",
    postStyle: "pure-image" as string,
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
    try {
      const response = await fetch("/api/posts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandSpaceId: formData.brandSpaceId,
          postType: formData.postType,
          format: formData.format,
          language: effectiveLanguage,
          contentIdea: formData.contentIdea,
          postStyle: formData.postStyle,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        const msg = err.details || err.error || "Failed to generate draft";
        throw new Error(msg);
      }

      const data = await response.json();
      setDraft({
        caption: data.caption || { hook: "", body: "", cta: "", hashtags: [] },
        visualAdvice: data.visualAdvice || "",
      });
      setStep(4);
    } catch (error: unknown) {
      console.error("Error generating draft:", error);
      alert(
        error instanceof Error ? error.message : "Failed to generate draft. Please try again."
      );
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
          postStyle: formData.postStyle,
          confirmedCaption: draft.caption,
          confirmedVisualAdvice: draft.visualAdvice,
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
            className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
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
              className="mt-2 w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">
            Describe the post you want to create *
          </label>
          <textarea
            required
            value={formData.contentIdea}
            onChange={(e) =>
              setFormData({ ...formData, contentIdea: e.target.value })
            }
            className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            rows={6}
            placeholder="e.g., Announce our new product launch, share a customer testimonial, or create an educational carousel about..."
          />
        </div>

        <div className="p-4 rounded-xl bg-zinc-800/30 border border-white/5">
          <p className="text-sm font-medium text-zinc-400 mb-2">
            Post Style (視覺風格)
          </p>
          <p className="text-xs text-zinc-500 mb-3">
            Choose the visual style. Your content idea above stays unchanged.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: "pure-image", label: "純圖片 (No text overlay)" },
              { value: "image-with-title", label: "圖片+標題 (Image with title)" },
              { value: "infographic", label: "圖表/資訊圖 (Illustrative graphs)" },
              { value: "quote-overlay", label: "引文疊加 (Quote overlay)" },
              { value: "split-layout", label: "圖文分欄 (Photo + text card)" },
              { value: "before-after", label: "前後對比 (Before & after)" },
              { value: "minimal-text", label: "極簡文字 (Minimal subtle text)" },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, postStyle: value })
                }
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  formData.postStyle === value
                    ? "border-violet-500 bg-violet-500/20 text-violet-200"
                    : "border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                {label}
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
            className="flex-1 px-4 py-2.5 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
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
              Caption (可編輯)
            </label>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-zinc-500">Hook:</span>
                <textarea
                  value={draft.caption.hook}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      caption: { ...draft.caption, hook: e.target.value },
                    })
                  }
                  className="w-full mt-1 px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <span className="text-xs text-zinc-500">Body:</span>
                <textarea
                  value={draft.caption.body}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      caption: { ...draft.caption, body: e.target.value },
                    })
                  }
                  className="w-full mt-1 px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
                  rows={4}
                />
              </div>
              <div>
                <span className="text-xs text-zinc-500">CTA:</span>
                <input
                  type="text"
                  value={draft.caption.cta}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      caption: { ...draft.caption, cta: e.target.value },
                    })
                  }
                  className="w-full mt-1 px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
                />
              </div>
              <div>
                <span className="text-xs text-zinc-500">Hashtags (comma-separated):</span>
                <input
                  type="text"
                  value={Array.isArray(draft.caption.hashtags) ? draft.caption.hashtags.join(", ") : ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      caption: {
                        ...draft.caption,
                        hashtags: e.target.value.split(",").map((h) => h.trim()).filter(Boolean),
                      },
                    })
                  }
                  className="w-full mt-1 px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
                  placeholder="#hashtag1 #hashtag2"
                />
              </div>
            </div>
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
              rows={6}
              placeholder="AI-generated visual description for the image..."
            />
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
