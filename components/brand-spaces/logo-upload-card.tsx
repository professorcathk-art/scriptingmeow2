"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LogoPlacement } from "@/types/database";

const LOGO_PLACEMENT_OPTIONS: { value: LogoPlacement; label: string }[] = [
  { value: "none", label: "No logo" },
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

interface LogoUploadCardProps {
  brandSpaceId: string;
  logoUrl: string | null;
  logoPlacement: LogoPlacement | null;
}

export function LogoUploadCard({
  brandSpaceId,
  logoUrl,
  logoPlacement,
}: LogoUploadCardProps) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [savingPlacement, setSavingPlacement] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/brand-spaces/${brandSpaceId}/logo`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      router.refresh();
    } catch {
      alert("Failed to upload logo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemove = async () => {
    try {
      const res = await fetch(`/api/brand-spaces/${brandSpaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: null }),
      });
      if (!res.ok) throw new Error("Failed to remove");
      router.refresh();
    } catch {
      alert("Failed to remove logo");
    }
  };

  const handlePlacementChange = async (value: LogoPlacement) => {
    setSavingPlacement(true);
    try {
      const res = await fetch(`/api/brand-spaces/${brandSpaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoPlacement: value }),
      });
      if (!res.ok) throw new Error("Failed to save");
      router.refresh();
    } catch {
      alert("Failed to save logo placement");
    } finally {
      setSavingPlacement(false);
    }
  };

  return (
    <div className="p-6 glass rounded-2xl border border-white/5">
      <h2 className="text-xl font-semibold text-white mb-2">Brand Logo</h2>
      <p className="text-zinc-400 text-sm mb-4">
        Upload your logo to include it in generated posts. Choose where it appears.
      </p>
      {logoUrl ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <img
              src={logoUrl}
              alt="Brand logo"
              className="w-16 h-16 object-contain rounded-lg border border-white/10"
            />
            <div className="flex gap-2">
              <label className="px-4 py-2 rounded-xl bg-white/10 cursor-pointer hover:bg-white/15 text-white text-sm transition-colors">
                {uploading ? "Uploading..." : "Change Logo"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleUpload}
                />
              </label>
              <button
                type="button"
                onClick={handleRemove}
                className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-red-400 text-sm"
              >
                Remove
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">
              Logo placement in generated images
            </label>
            <select
              value={logoPlacement ?? "none"}
              onChange={(e) => handlePlacementChange(e.target.value as LogoPlacement)}
              disabled={savingPlacement}
              className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            >
              {LOGO_PLACEMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <label className="block border-2 border-dashed border-white/10 rounded-xl p-6 text-center cursor-pointer hover:border-violet-500/30 transition-colors">
          <span className="text-zinc-400 text-sm">
            {uploading ? "Uploading..." : "Click to upload logo"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
      )}
    </div>
  );
}
