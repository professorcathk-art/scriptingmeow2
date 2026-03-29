"use client";

import { useState } from "react";
import type { StructuredIdeaV1 } from "@/lib/idea-content";

type BrandOpt = { id: string; name: string };

type GenIdea = {
  summary: string;
  contentFocus: string;
  textOnImage: string;
  arrangement: string;
  visualAdvice: string;
};

function toStoredContent(idea: GenIdea): string {
  const payload: StructuredIdeaV1 = {
    v: 1,
    summary: idea.summary,
    contentFocus: idea.contentFocus,
    textOnImage: idea.textOnImage,
    arrangement: idea.arrangement,
    visualAdvice: idea.visualAdvice,
  };
  return JSON.stringify(payload);
}

interface IdeaBankAiPanelProps {
  brandSpaces: BrandOpt[];
  onSaved: () => void;
}

export function IdeaBankAiPanel({ brandSpaces, onSaved }: IdeaBankAiPanelProps) {
  const [brandSpaceId, setBrandSpaceId] = useState(brandSpaces[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<GenIdea[] | null>(null);
  const [selected, setSelected] = useState<Record<number, boolean>>({ 0: false, 1: false, 2: false });
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!brandSpaceId) {
      setError("Select a brand first.");
      return;
    }
    setLoading(true);
    setError(null);
    setIdeas(null);
    try {
      const res = await fetch("/api/library/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandSpaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? data.details ?? "Failed to generate");
      const list = (data.ideas ?? []) as GenIdea[];
      setIdeas(list);
      setSelected({ 0: false, 1: false, 2: false });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate ideas");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSelected = async () => {
    if (!brandSpaceId || !ideas?.length) return;
    const idxs = Object.entries(selected)
      .filter(([, on]) => on)
      .map(([i]) => Number(i));
    if (idxs.length === 0) {
      alert("Tick at least one idea to save.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const i of idxs) {
        const idea = ideas[i];
        if (!idea) continue;
        const res = await fetch("/api/library/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandSpaceId,
            content: toStoredContent(idea),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Save failed");
        }
      }
      setIdeas(null);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (brandSpaces.length === 0) {
    return (
      <p className="text-sm text-zinc-500 mb-4">
        Create a brand space first to generate ideas.
      </p>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-zinc-900/50 border border-violet-500/20 mb-6">
      <h3 className="text-sm font-semibold text-zinc-200 mb-2">AI: generate 3 ideas</h3>
      <p className="text-xs text-zinc-500 mb-3">
        Ideas are checked against your brand info. Save one or more to your Idea Bank.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <select
          value={brandSpaceId}
          onChange={(e) => setBrandSpaceId(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm"
        >
          {brandSpaces.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !brandSpaceId}
          className="px-4 py-2 rounded-xl gradient-ai text-white text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate 3 ideas"}
        </button>
      </div>
      {error && <p className="text-sm text-amber-400 mb-2">{error}</p>}

      {ideas && ideas.length > 0 && (
        <div className="space-y-3 mt-4">
          {ideas.map((idea, i) => (
            <label
              key={i}
              className="flex gap-3 p-3 rounded-lg bg-zinc-800/40 border border-white/5 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected[i] ?? false}
                onChange={(e) => setSelected((prev) => ({ ...prev, [i]: e.target.checked }))}
                className="mt-1"
              />
              <div className="text-sm text-zinc-300 space-y-1 min-w-0">
                <p className="font-medium text-zinc-100">{idea.summary || `Idea ${i + 1}`}</p>
                <p><span className="text-zinc-500">Focus:</span> {idea.contentFocus}</p>
                <p><span className="text-zinc-500">Text on image:</span> {idea.textOnImage}</p>
                <p><span className="text-zinc-500">Arrangement:</span> {idea.arrangement}</p>
                <p><span className="text-zinc-500">Visual:</span> {idea.visualAdvice}</p>
              </div>
            </label>
          ))}
          <button
            type="button"
            onClick={handleSaveSelected}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-violet-500/20 text-violet-200 border border-violet-500/40 hover:bg-violet-500/30 text-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save selected to Idea Bank"}
          </button>
        </div>
      )}
    </div>
  );
}
