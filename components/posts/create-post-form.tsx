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
  { id: 2, label: "Select Format" },
  { id: 3, label: "Generate Content" },
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brandSpaceId: "",
    postType: "single-image" as PostType,
    format: "square" as PostFormat,
    language: "English",
    customLanguage: "",
    contentIdea: "",
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

  const handleGenerate = async () => {
    if (!canGenerate) {
      alert("Not enough credits. Please upgrade your plan.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          language: effectiveLanguage,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate posts");
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
            Quick Templates:
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              "Educational carousel",
              "Announcement",
              "Soft promotion",
              "Before & after",
            ].map((template) => (
              <button
                key={template}
                type="button"
                onClick={() =>
                  setFormData({ ...formData, contentIdea: template })
                }
                className="px-3 py-1.5 text-sm rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/20 hover:bg-white/5 transition-colors"
              >
                {template}
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
            Next: Variations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <Stepper />
      <h2 className="text-xl font-semibold text-zinc-100">
        Step 3: Variations & Credits
      </h2>

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
          onClick={handleGenerate}
          disabled={loading || !canGenerate}
          className="flex-1 px-4 py-2.5 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          {loading ? "Generating..." : "Create Posts"}
        </button>
      </div>
    </div>
  );
}
