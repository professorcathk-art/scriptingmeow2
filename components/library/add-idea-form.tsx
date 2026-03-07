"use client";

import { useState } from "react";

type PostIdea = { id: string; content: string; created_at: string };

interface AddIdeaFormProps {
  onAdd: (idea: PostIdea) => void;
  onCancel: () => void;
}

export function AddIdeaForm({ onAdd, onCancel }: AddIdeaFormProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim().slice(0, 2000);
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await fetch("/api/library/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (!res.ok) throw new Error("Failed");
      const idea = await res.json();
      onAdd(idea);
      setContent("");
    } catch {
      alert("Failed to add idea");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-zinc-900/50 border border-white/10 mb-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="e.g., Announce our new product launch, share a customer testimonial..."
        className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
        rows={4}
        maxLength={2000}
      />
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white">
          Cancel
        </button>
        <button type="submit" disabled={loading || !content.trim()} className="px-4 py-2 rounded-xl gradient-ai text-white font-medium disabled:opacity-50">
          {loading ? "Adding..." : "Add"}
        </button>
      </div>
    </form>
  );
}
