"use client";

import Link from "next/link";
import type { LandingStyleItem } from "@/lib/landing-styles";

interface SaveStyleModalProps {
  item: LandingStyleItem;
  onClose: () => void;
  isAuthenticated: boolean;
}

export function SaveStyleModal({
  item,
  onClose,
  isAuthenticated,
}: SaveStyleModalProps) {
  const handleSave = () => {
    if (isAuthenticated) {
      const base = typeof window !== "undefined" ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin) : "https://designermeow.com";
      const imageUrl = item.imageUrl.startsWith("http") ? item.imageUrl : `${base}${item.imageUrl.startsWith("/") ? "" : "/"}${item.imageUrl}`;
      fetch("/api/library/save-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      })
        .then((res) => {
          if (res.ok) window.location.href = "/library?tab=references";
          else alert("Failed to save");
        })
        .catch(() => alert("Failed to save"));
    } else {
      sessionStorage.setItem("saveStyle_imageUrl", item.imageUrl.startsWith("/") ? item.imageUrl : `/${item.imageUrl}`);
      sessionStorage.setItem("saveStyle_redirect", "/library?tab=references");
      window.location.href = `/auth/signup?redirect=${encodeURIComponent("/library?tab=references")}`;
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
          Save &quot;{item.category}&quot; style
        </h3>
        <p className="text-sm text-zinc-400 mb-6">
          {isAuthenticated
            ? "Save this style to your Library → References. Use it later as inspiration for your posts."
            : "Sign in or sign up to save this style to your Library. You can view it in References after logging in."}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl gradient-ai text-white font-semibold hover:opacity-90 transition-opacity"
          >
            {isAuthenticated ? "Save to Library" : "Sign Up & Save"}
          </button>
        </div>
        {!isAuthenticated && (
          <p className="text-xs text-zinc-500 text-center mt-3">
            Already have an account?{" "}
            <Link
              href={`/auth/login?redirect=${encodeURIComponent("/library?tab=references")}`}
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
