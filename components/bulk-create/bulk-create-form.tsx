"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCredits } from "@/components/credits/credits-provider";
import { CreateTemplateModal } from "./create-template-modal";

type BrandSpace = { id: string; name: string };
type Template = {
  id: string;
  name: string;
  brand_space_id: string;
  content_framework?: string;
  post_style?: string;
  post_type: string;
  format: string;
  custom_width?: number | null;
  custom_height?: number | null;
  carousel_page_count?: number | null;
  carousel_pages?: Array<{ pageIndex: number; header: string; imageTextOnImage: string; visualAdvice: string }> | null;
};
type Idea = { id: string; content: string; title?: string | null };

interface BulkCreateFormProps {
  brandSpaces: BrandSpace[];
  templates: Template[];
  postIdeas: Idea[];
  rssIdeas: Idea[];
  userCredits: number;
}

export function BulkCreateForm({
  brandSpaces,
  templates,
  postIdeas,
  rssIdeas,
  userCredits: initialCredits,
}: BulkCreateFormProps) {
  const router = useRouter();
  const creditsCtx = useCredits();
  const userCredits = creditsCtx?.creditsRemaining ?? initialCredits;

  const [templateId, setTemplateId] = useState("");
  const [selectedIdeaIds, setSelectedIdeaIds] = useState<Set<string>>(new Set());
  const [selectedRssIdeaIds, setSelectedRssIdeaIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: string[]; failed: number } | null>(null);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === templateId);
  const brandSpaceId = selectedTemplate?.brand_space_id ?? "";
  const isCarousel = selectedTemplate?.post_type === "carousel";
  const carouselPages = selectedTemplate?.carousel_page_count ?? selectedTemplate?.carousel_pages?.length ?? 3;
  const creditsPerPost = isCarousel ? carouselPages : 1;
  const totalIdeas = selectedIdeaIds.size + selectedRssIdeaIds.size;
  const totalCreditsNeeded = totalIdeas * creditsPerPost;
  const canRun = totalIdeas > 0 && templateId && userCredits >= totalCreditsNeeded;

  const toggleIdea = (id: string) => {
    setSelectedIdeaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRssIdea = (id: string) => {
    setSelectedRssIdeaIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/posts/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          ideaIds: Array.from(selectedIdeaIds),
          rssIdeaIds: Array.from(selectedRssIdeaIds),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Bulk generate failed");
      }
      setResult({ created: data.created ?? [], failed: data.failed ?? 0 });
      if (typeof data.credits_remaining === "number") {
        creditsCtx?.setCredits(data.credits_remaining);
      }
      if (data.created?.length > 0) {
        router.push(`/posts/${data.created[0]}/review`);
      } else {
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk generate failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-zinc-400">1. Template (includes brand)</label>
            <button
              type="button"
              onClick={() => setShowCreateTemplate(true)}
              className="px-4 py-2.5 rounded-xl border-2 border-violet-500/50 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/70 transition-colors text-sm font-medium"
            >
              + Create template
            </button>
          </div>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-white/10 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value="">Select template</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {brandSpaces.find((b) => b.id === t.brand_space_id)?.name ?? "Brand"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-2">2. Ideas (select from Idea Bank & RSS)</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10">
            <h4 className="text-sm font-medium text-zinc-300 mb-2">Idea Bank</h4>
            {postIdeas.length === 0 ? (
              <p className="text-zinc-500 text-sm">No ideas yet. Add ideas in Library.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {postIdeas.map((idea) => (
                  <label
                    key={idea.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIdeaIds.has(idea.id)}
                      onChange={() => toggleIdea(idea.id)}
                      className="mt-1 rounded border-white/20"
                    />
                    <span className="text-sm text-zinc-300 line-clamp-2">{idea.content}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10">
            <h4 className="text-sm font-medium text-zinc-300 mb-2">RSS Autofeed</h4>
            {rssIdeas.length === 0 ? (
              <p className="text-zinc-500 text-sm">No RSS ideas. Add RSS feeds in Library (paid users).</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {rssIdeas.map((idea) => (
                  <label
                    key={idea.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRssIdeaIds.has(idea.id)}
                      onChange={() => toggleRssIdea(idea.id)}
                      className="mt-1 rounded border-white/20"
                    />
                    <span className="text-sm text-zinc-300 line-clamp-2">{idea.title || idea.content}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/10">
        <p className="text-sm text-zinc-400">
          Selected: <strong className="text-zinc-200">{totalIdeas}</strong> ideas
          {selectedTemplate && (
            <>
              {" "}
              · Credits: <strong className="text-zinc-200">{totalCreditsNeeded}</strong> ({creditsPerPost} per{" "}
              {isCarousel ? "carousel" : "post"})
            </>
          )}
        </p>
        <p className="text-xs text-zinc-500 mt-1">
          You have {userCredits} credits remaining
        </p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {result && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <p className="text-emerald-400 mb-2">
            Created {result.created.length} post(s) {result.failed > 0 ? `· ${result.failed} failed` : ""}
          </p>
          {result.created.length > 0 && (
            <a href="/library" className="text-sm text-violet-400 hover:text-violet-300">
              View in Library →
            </a>
          )}
        </div>
      )}

      {loading && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
          Please stay on this page. Do not leave or refresh while AI is generating. This may take several minutes.
        </div>
      )}

      <button
        type="button"
        onClick={handleRun}
        disabled={!canRun || loading}
        className="w-full px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? "Generating..." : `Generate ${totalIdeas} Post(s)`}
      </button>

      {showCreateTemplate && (
        <CreateTemplateModal
          brandSpaces={brandSpaces}
          onClose={() => setShowCreateTemplate(false)}
          onCreated={() => {
            router.refresh();
            setShowCreateTemplate(false);
          }}
        />
      )}
    </div>
  );
}
