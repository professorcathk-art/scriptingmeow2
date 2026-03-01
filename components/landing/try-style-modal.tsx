"use client";

import { useState } from "react";
import Link from "next/link";
import type { LandingStyleItem } from "@/lib/landing-styles";

interface TryStyleModalProps {
  item: LandingStyleItem;
  onClose: () => void;
  isAuthenticated: boolean;
}

export function TryStyleModal({
  item,
  onClose,
  isAuthenticated,
}: TryStyleModalProps) {
  const [contentIdea, setContentIdea] = useState("");

  const handleContinue = () => {
    const params = new URLSearchParams();
    params.set("styleId", item.id);
    if (contentIdea.trim()) params.set("contentIdea", contentIdea.trim());
    const query = params.toString();
    const tryStyleUrl = `/try-style${query ? `?${query}` : ""}`;
    if (isAuthenticated) {
      window.location.href = tryStyleUrl;
    } else {
      sessionStorage.setItem("tryStyle_styleId", item.id);
      sessionStorage.setItem("tryStyle_contentIdea", contentIdea.trim());
      sessionStorage.setItem("tryStyle_visualAdvice", item.visualAdvice);
      window.location.href = `/auth/signup?redirect=${encodeURIComponent(tryStyleUrl)}`;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass-elevated rounded-2xl p-6 sm:p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold text-white mb-2">
          Use &quot;{item.category}&quot; style
        </h3>
        <p className="text-sm text-zinc-400 mb-4">
          What&apos;s your post about? We&apos;ll generate an image in this style.
        </p>
        <textarea
          value={contentIdea}
          onChange={(e) => setContentIdea(e.target.value)}
          placeholder="e.g., My new sustainable fashion line launching next month..."
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
          rows={4}
        />
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="flex-1 py-3 rounded-xl gradient-ai text-white font-semibold hover:opacity-90 transition-opacity"
          >
            {isAuthenticated ? "Create Post" : "Sign Up & Create"}
          </button>
        </div>
        {!isAuthenticated && (
          <p className="text-xs text-zinc-500 text-center mt-3">
            Free account. 1 credit to try. No credit card required.{" "}
            <Link
              href={`/auth/login?redirect=${encodeURIComponent(
                `/try-style?styleId=${item.id}${contentIdea.trim() ? `&contentIdea=${encodeURIComponent(contentIdea.trim())}` : ""}`
              )}`}
              className="text-violet-400 hover:text-violet-300"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
