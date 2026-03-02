"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BrandType } from "@/types/database";

interface EditBrandSpaceFormProps {
  brandSpaceId: string;
  initialData: {
    name: string;
    brand_type: BrandType;
    brand_details?: {
      targetAudiences?: string;
      painPoints?: string;
      desiredOutcomes?: string;
      valueProposition?: string;
      otherBrandType?: string;
    };
  };
}

export function EditBrandSpaceForm({
  brandSpaceId,
  initialData,
}: EditBrandSpaceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData.name,
    brandType: (["shop", "agency"].includes(initialData.brand_type as string)
      ? ((initialData.brand_type as string) === "shop" ? "ecommerce-retail" : "service-agency")
      : initialData.brand_type) as BrandType,
    brandTypeOther: initialData.brand_details?.otherBrandType ?? "",
    targetAudiences: initialData.brand_details?.targetAudiences ?? "",
    painPoints: initialData.brand_details?.painPoints ?? "",
    desiredOutcomes: initialData.brand_details?.desiredOutcomes ?? "",
    valueProposition: initialData.brand_details?.valueProposition ?? "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`/api/brand-spaces/${brandSpaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          brandType: formData.brandType,
          brandTypeOther: formData.brandType === "other" ? formData.brandTypeOther : undefined,
          targetAudiences: formData.targetAudiences,
          painPoints: formData.painPoints,
          desiredOutcomes: formData.desiredOutcomes,
          valueProposition: formData.valueProposition,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update brand space");
      }

      router.push(`/brand-spaces/${brandSpaceId}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating brand space:", error);
      alert("Failed to update brand space. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 bg-zinc-900/50 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-white/10">
      <h2 className="text-xl font-semibold text-zinc-100">Edit Brand Basic Info</h2>

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
          className={inputClass}
          placeholder="e.g., My Personal Brand"
        />
      </div>

      <p className="text-sm text-zinc-500">
        To upload your logo and set its placement in generated posts, go to{" "}
        <a href={`/brand-spaces/${brandSpaceId}/brandbook`} className="text-violet-400 hover:text-violet-300">
          Edit brandbook
        </a>.
      </p>

      <div>
        <label htmlFor="brandType" className="block text-sm font-medium text-zinc-400 mb-2">
          Brand Type *
        </label>
        <select
          id="brandType"
          required={formData.brandType !== "other"}
          value={formData.brandType}
          onChange={(e) =>
            setFormData({
              ...formData,
              brandType: e.target.value as BrandType,
              brandTypeOther: e.target.value === "other" ? formData.brandTypeOther : "",
            })
          }
          className={inputClass}
        >
          <option value="personal-brand">Personal Brand / Creator</option>
          <option value="ecommerce-retail">E-commerce / Retail</option>
          <option value="service-agency">Service Provider / Agency</option>
          <option value="local-business">Local Business / Brick & Mortar</option>
          <option value="tech-startup">Tech / Software / Startup</option>
          <option value="community-nonprofit">Community / Non-Profit</option>
          <option value="other">Other: please specify</option>
        </select>
        {formData.brandType === "other" && (
          <input
            type="text"
            required
            value={formData.brandTypeOther}
            onChange={(e) => setFormData({ ...formData, brandTypeOther: e.target.value })}
            placeholder="Please specify your brand type"
            className="mt-2 w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50"
          />
        )}
      </div>

      <div>
        <label htmlFor="targetAudiences" className="block text-sm font-medium text-zinc-400 mb-2">
          Target Audiences
        </label>
        <textarea
          id="targetAudiences"
          value={formData.targetAudiences}
          onChange={(e) => setFormData({ ...formData, targetAudiences: e.target.value })}
          className={inputClass}
          rows={3}
          placeholder="Who do you want to reach? (one per line)"
        />
      </div>

      <div>
        <label htmlFor="painPoints" className="block text-sm font-medium text-zinc-400 mb-2">
          Audience Pain Points
        </label>
        <textarea
          id="painPoints"
          value={formData.painPoints}
          onChange={(e) => setFormData({ ...formData, painPoints: e.target.value })}
          className={inputClass}
          rows={3}
          placeholder="What problems does your audience face?"
        />
      </div>

      <div>
        <label htmlFor="desiredOutcomes" className="block text-sm font-medium text-zinc-400 mb-2">
          Desired Outcomes
        </label>
        <textarea
          id="desiredOutcomes"
          value={formData.desiredOutcomes}
          onChange={(e) => setFormData({ ...formData, desiredOutcomes: e.target.value })}
          className={inputClass}
          rows={3}
          placeholder="What outcomes do they want?"
        />
      </div>

      <div>
        <label htmlFor="valueProposition" className="block text-sm font-medium text-zinc-400 mb-2">
          Value Proposition
        </label>
        <textarea
          id="valueProposition"
          value={formData.valueProposition}
          onChange={(e) => setFormData({ ...formData, valueProposition: e.target.value })}
          className={inputClass}
          rows={4}
          placeholder="What makes your brand unique?"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
