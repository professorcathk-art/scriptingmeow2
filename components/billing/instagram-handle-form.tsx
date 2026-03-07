"use client";

import { useState } from "react";

interface InstagramHandleFormProps {
  initialHandle: string;
  onSaved?: () => void;
}

export function InstagramHandleForm({ initialHandle, onSaved }: InstagramHandleFormProps) {
  const [handle, setHandle] = useState(initialHandle.replace(/^@/, ""));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instagramHandle: handle.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved?.();
    } catch {
      alert("Failed to save Instagram handle.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label htmlFor="instagram-handle" className="block text-sm font-medium text-zinc-400 mb-2">
          Instagram Handle
        </label>
        <div className="flex gap-2">
          <span className="flex items-center px-3 rounded-xl bg-white/5 border border-white/10 text-zinc-500 text-sm">
            @
          </span>
          <input
            id="instagram-handle"
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value.replace(/^@/, ""))}
            placeholder="tenthproject"
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 disabled:opacity-50 text-sm font-medium"
          >
            {saving ? "Saving…" : saved ? "Saved!" : "Save"}
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Connect your Instagram handle to be featured in our public Discover gallery and get free traffic to your profile.
        </p>
      </div>
    </form>
  );
}
