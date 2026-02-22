"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandType } from "@/types/database";
import { PolishModal } from "./polish-modal";

type PolishField = "targetAudiences" | "painPoints" | "desiredOutcomes" | "valueProposition";

const POLISH_FIELD_LABELS: Record<PolishField, string> = {
  targetAudiences: "Target Audiences",
  painPoints: "Audience Pain Points",
  desiredOutcomes: "Desired Outcomes",
  valueProposition: "Value Proposition",
};

export function CreateBrandSpaceForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [polishField, setPolishField] = useState<PolishField | null>(null);
  const [polishLoading, setPolishLoading] = useState(false);
  const [polishedText, setPolishedText] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    brandType: "personal-brand" as BrandType,
    targetAudiences: "",
    painPoints: "",
    desiredOutcomes: "",
    valueProposition: "",
  });

  const handlePolishClick = async (field: PolishField) => {
    const text = formData[field];
    if (!text.trim()) {
      alert("Please enter some text first before polishing.");
      return;
    }
    setPolishField(field);
    setPolishLoading(true);
    setPolishedText("");
    try {
      const res = await fetch("/api/ai/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          fieldLabel: POLISH_FIELD_LABELS[field],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to polish");
      }
      const { polishedText: result } = await res.json();
      setPolishedText(result);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to polish. Please try again.");
      setPolishField(null);
    } finally {
      setPolishLoading(false);
    }
  };

  const handlePolishConfirm = () => {
    if (polishField && polishedText) {
      setFormData((prev) => ({ ...prev, [polishField]: polishedText }));
    }
    setPolishField(null);
    setPolishedText("");
  };

  const handlePolishCancel = () => {
    setPolishField(null);
    setPolishedText("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/brand-spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create brand space");
      }

      const data = await response.json();
      // Store brand details in sessionStorage to use in brandbook generation
      if (data.brandDetails) {
        sessionStorage.setItem(`brandDetails_${data.id}`, JSON.stringify(data.brandDetails));
      }
      router.push(`/brand-spaces/${data.id}/brandbook`);
    } catch (error) {
      console.error("Error creating brand space:", error);
      alert("Failed to create brand space. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); setStep(2); }} className="space-y-6 glass-elevated p-6 rounded-2xl">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-zinc-400 mb-2">
            Brand Name *
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
            placeholder="e.g., My Personal Brand"
          />
        </div>

        <div>
          <label htmlFor="brandType" className="block text-sm font-medium text-zinc-400 mb-2">
            Brand Type *
          </label>
          <select
            id="brandType"
            required
            value={formData.brandType}
            onChange={(e) => setFormData({ ...formData, brandType: e.target.value as BrandType })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
          >
            <option value="personal-brand">Personal Brand</option>
            <option value="shop">Shop</option>
            <option value="agency">Agency</option>
            <option value="local-business">Local Business</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-2 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 rounded-xl gradient-ai text-white font-medium hover:opacity-90 transition-opacity"
          >
            Next: Brand Details
          </button>
        </div>
      </form>
    );
  }

  if (step === 2) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); setStep(3); }} className="space-y-6 glass-elevated p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-4">Tell us about your brand</h2>
        </div>

        <div>
          <label htmlFor="targetAudiences" className="block text-sm font-medium text-zinc-400 mb-2">
            Target Audiences *
          </label>
          <textarea
            id="targetAudiences"
            required
            value={formData.targetAudiences}
            onChange={(e) => setFormData({ ...formData, targetAudiences: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
            rows={3}
            placeholder="Who do you want to reach? (e.g., Young professionals aged 25-35, Small business owners)"
          />
          <button
            type="button"
            onClick={() => handlePolishClick("targetAudiences")}
            disabled={polishLoading}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50 shimmer-effect"
          >
            <span>✨</span> Polish with AI
          </button>
        </div>

        <div>
          <label htmlFor="painPoints" className="block text-sm font-medium text-zinc-400 mb-2">
            Audience Pain Points *
          </label>
          <textarea
            id="painPoints"
            required
            value={formData.painPoints}
            onChange={(e) => setFormData({ ...formData, painPoints: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
            rows={3}
            placeholder="What problems does your audience face? (e.g., Lack of time, Difficulty finding reliable solutions)"
          />
          <button
            type="button"
            onClick={() => handlePolishClick("painPoints")}
            disabled={polishLoading}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50"
          >
            <span>✨</span> Polish with AI
          </button>
        </div>

        <div>
          <label htmlFor="desiredOutcomes" className="block text-sm font-medium text-zinc-400 mb-2">
            Desired Outcomes *
          </label>
          <textarea
            id="desiredOutcomes"
            required
            value={formData.desiredOutcomes}
            onChange={(e) => setFormData({ ...formData, desiredOutcomes: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
            rows={3}
            placeholder="What outcomes do they want? (e.g., Save time, Achieve better results, Feel confident)"
          />
          <button
            type="button"
            onClick={() => handlePolishClick("desiredOutcomes")}
            disabled={polishLoading}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50"
          >
            <span>✨</span> Polish with AI
          </button>
        </div>

        <div>
          <label htmlFor="valueProposition" className="block text-sm font-medium text-zinc-400 mb-2">
            Value Proposition *
          </label>
          <textarea
            id="valueProposition"
            required
            value={formData.valueProposition}
            onChange={(e) => setFormData({ ...formData, valueProposition: e.target.value })}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
            rows={4}
            placeholder="Describe what makes your brand unique and valuable in your own words..."
          />
          <button
            type="button"
            onClick={() => handlePolishClick("valueProposition")}
            disabled={polishLoading}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50"
          >
            <span>✨</span> Polish with AI
          </button>
        </div>

        {polishField && (
          <PolishModal
            originalText={formData[polishField]}
            polishedText={polishedText}
            fieldLabel={POLISH_FIELD_LABELS[polishField]}
            onConfirm={handlePolishConfirm}
            onCancel={handlePolishCancel}
            loading={polishLoading}
          />
        )}

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="flex-1 px-4 py-2 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 px-4 py-2 rounded-xl gradient-ai text-white font-medium hover:opacity-90 transition-opacity"
          >
            Next: Upload References
          </button>
        </div>
      </form>
    );
  }

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    setUploadedImages((prev) => [...prev, ...fileArray]);
  };

  const handleSubmitWithImages = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // First create brand space
      const response = await fetch("/api/brand-spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create brand space");
      }

      const data = await response.json();
      const brandSpaceId = data.id;

      // Upload images if any
      if (uploadedImages.length > 0) {
        setUploading(true);
        const formDataImages = new FormData();
        uploadedImages.forEach((file) => {
          formDataImages.append("files", file);
        });

        const uploadResponse = await fetch(`/api/brand-spaces/${brandSpaceId}/images`, {
          method: "POST",
          body: formDataImages,
        });

        if (!uploadResponse.ok) {
          console.error("Failed to upload images, but brand space was created");
        }
        setUploading(false);
      }

      // Store brand details in sessionStorage
      if (data.brandDetails) {
        sessionStorage.setItem(`brandDetails_${brandSpaceId}`, JSON.stringify(data.brandDetails));
      }
      router.push(`/brand-spaces/${brandSpaceId}/brandbook`);
    } catch (error) {
      console.error("Error creating brand space:", error);
      alert("Failed to create brand space. Please try again.");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmitWithImages} className="space-y-6 glass-elevated p-6 rounded-2xl">
      <div>
        <h2 className="text-xl font-semibold mb-4">Upload Reference Images (Optional)</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Upload 3-10 of your past IG posts or target style references for better results.
        </p>
        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
          <p className="text-zinc-400 mb-2">Drag and drop images here, or click to browse</p>
          <input
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            id="image-upload"
            onChange={(e) => handleImageUpload(e.target.files)}
          />
          <label
            htmlFor="image-upload"
            className="inline-block px-4 py-2 bg-white/10 rounded-xl cursor-pointer hover:bg-white/15 text-white transition-colors"
          >
            Choose Files
          </label>
          {uploadedImages.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-zinc-400 mb-2">
                {uploadedImages.length} image(s) selected
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {uploadedImages.map((file, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${index + 1}`}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setUploadedImages((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex-1 px-4 py-2 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={loading || uploading}
          className="flex-1 px-4 py-2 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {uploading ? "Uploading images..." : loading ? "Creating..." : "Create Brand Space"}
        </button>
      </div>
    </form>
  );
}
