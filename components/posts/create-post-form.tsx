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
    contentIdea: "",
    variations: 1,
  });

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
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate posts");
      }

      const data = await response.json();
      router.push(`/posts/${data.id}/review`);
    } catch (error: any) {
      console.error("Error generating post:", error);
      alert(error.message || "Failed to generate post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="bg-white p-6 rounded-lg border space-y-6">
        <h2 className="text-xl font-semibold">Step 1: Select Brand & Post Type</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brand Space *
          </label>
          <select
            required
            value={formData.brandSpaceId}
            onChange={(e) => setFormData({ ...formData, brandSpaceId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Post Type *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, postType: "single-image" })}
              className={`p-4 border-2 rounded-lg text-left ${
                formData.postType === "single-image"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300"
              }`}
            >
              <div className="font-medium">Single Image</div>
              <div className="text-sm text-gray-600">One image post</div>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, postType: "carousel" })}
              className={`p-4 border-2 rounded-lg text-left ${
                formData.postType === "carousel"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300"
              }`}
            >
              <div className="font-medium">Carousel</div>
              <div className="text-sm text-gray-600">Multi-image post</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  setFormData({ ...formData, format: format.value as PostFormat })
                }
                className={`p-3 border-2 rounded-lg ${
                  formData.format === format.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                }`}
              >
                <div className="font-medium text-sm">{format.label}</div>
                <div className="text-xs text-gray-600">{format.ratio}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => setStep(2)}
            disabled={!formData.brandSpaceId}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Next: Content
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="bg-white p-6 rounded-lg border space-y-6">
        <h2 className="text-xl font-semibold">Step 2: Content & Language</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Language *
          </label>
          <select
            required
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="English">English</option>
            <option value="Traditional Chinese">Traditional Chinese</option>
            <option value="Simplified Chinese">Simplified Chinese</option>
            <option value="Bilingual">Bilingual (English + Chinese)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe the post you want to create *
          </label>
          <textarea
            required
            value={formData.contentIdea}
            onChange={(e) => setFormData({ ...formData, contentIdea: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={6}
            placeholder="e.g., Announce our new product launch, share a customer testimonial, or create an educational carousel about..."
          />
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm font-medium mb-2">Quick Templates:</p>
          <div className="flex flex-wrap gap-2">
            {["Educational carousel", "Announcement", "Soft promotion", "Before & after"].map(
              (template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setFormData({ ...formData, contentIdea: template })}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-white"
                >
                  {template}
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => setStep(3)}
            disabled={!formData.contentIdea}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Next: Variations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border space-y-6">
      <h2 className="text-xl font-semibold">Step 3: Variations & Credits</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of Variations
        </label>
        <select
          value={formData.variations}
          onChange={(e) =>
            setFormData({ ...formData, variations: parseInt(e.target.value) })
          }
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value={1}>1 variation</option>
          <option value={3}>3 variations</option>
          <option value={5}>5 variations</option>
        </select>
        <p className="text-sm text-gray-600 mt-1">
          1 credit = 1 generated variation for one size
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Credits Needed:</span>
          <span className="text-lg font-bold">{creditsNeeded} credits</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Your Credits:</span>
          <span className={`text-sm font-medium ${canGenerate ? "text-green-600" : "text-red-600"}`}>
            {userCredits} / {PLAN_LIMITS[planTier].monthly_credits}
          </span>
        </div>
        {!canGenerate && (
          <p className="text-sm text-red-600 mt-2">
            Not enough credits. <a href="/billing" className="underline">Upgrade your plan</a>
          </p>
        )}
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !canGenerate}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Create Posts"}
        </button>
      </div>
    </div>
  );
}
