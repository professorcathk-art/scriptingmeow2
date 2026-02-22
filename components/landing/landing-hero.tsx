"use client";

import { useState } from "react";
import Link from "next/link";

type Phase = "input" | "loading" | "reveal";

interface DemoResult {
  caption: { igCaption?: string; hook?: string; body?: string; cta?: string; hashtags?: string[] };
  visualUrl?: string;
  visualDescription: string;
  brandDescription: string;
}

interface LandingHeroProps {
  isAuthenticated?: boolean;
}

export function LandingHero({ isAuthenticated = false }: LandingHeroProps) {
  const [phase, setPhase] = useState<Phase>("input");
  const [brandInput, setBrandInput] = useState("");
  const [result, setResult] = useState<DemoResult | null>(null);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!brandInput.trim() || brandInput.trim().length < 10) {
      setError("Please describe your brand in at least a few words");
      return;
    }
    setError("");
    setPhase("loading");
    try {
      const res = await fetch("/api/demo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandDescription: brandInput.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate");
      }
      const data = await res.json();
      setResult(data);
      setPhase("reveal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("input");
    }
  };

  const handleBlurredAction = () => {
    setShowSignUpModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-20 glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">
            ScriptingMeow
          </span>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg gradient-ai text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium text-white transition-colors border border-white/10"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {phase === "input" && (
        <div className="w-full max-w-2xl mx-auto text-center space-y-8 animate-fade-in">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              Turn your brand into
              <br />
              <span className="gradient-ai-text">Instagram posts</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-xl mx-auto">
              Describe your brand in one sentence. See the magic in seconds.
            </p>
          </div>

          <div className="space-y-4">
            <div className="relative group">
              <input
                type="text"
                value={brandInput}
                onChange={(e) => setBrandInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="e.g., A luxury vegan skincare line for millennials who value sustainability..."
                className="w-full px-6 py-5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-lg"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-500/10 via-cyan-500/10 to-pink-500/10 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity -z-10" />
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              className="w-full py-4 px-6 rounded-2xl font-semibold text-lg gradient-ai text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-glow"
            >
              Generate a Post ✨
            </button>
          </div>

          <p className="text-sm text-zinc-500">
            No sign-up required. Try it free.
          </p>
        </div>
      )}

      {phase === "loading" && (
        <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Creating your post...
            </h2>
            <p className="text-zinc-400">AI is crafting something special</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-2xl p-6 space-y-4 animate-pulse">
              <div className="aspect-square bg-white/5 rounded-xl" />
              <div className="h-4 bg-white/5 rounded w-3/4" />
              <div className="h-4 bg-white/5 rounded w-1/2" />
            </div>
            <div className="glass rounded-2xl p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-white/5 rounded w-1/3" />
              <div className="h-20 bg-white/5 rounded" />
              <div className="h-20 bg-white/5 rounded" />
              <div className="h-12 bg-white/5 rounded w-1/2" />
            </div>
          </div>
        </div>
      )}

      {phase === "reveal" && result && (
        <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-white mb-2">
              Your post is ready
            </h2>
            <p className="text-zinc-400">
              Brand: {result.brandDescription}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Visual preview */}
            <div className="glass-elevated rounded-2xl p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4 uppercase tracking-wider">
                Visual Preview
              </h3>
              <div className="aspect-square rounded-xl overflow-hidden bg-white/5 shadow-float">
                {result.visualUrl ? (
                  <img
                    src={result.visualUrl}
                    alt="Generated post"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500">
                    <span className="text-sm">Preview</span>
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleBlurredAction}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 font-medium hover:bg-white/10 hover:text-white transition-all blur-sm hover:blur-none cursor-pointer relative"
                >
                  Download
                </button>
                <button
                  onClick={handleBlurredAction}
                  className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white/80 font-medium hover:bg-white/10 hover:text-white transition-all blur-sm hover:blur-none cursor-pointer"
                >
                  Generate Carousel
                </button>
              </div>
              <p className="text-xs text-zinc-500 text-center mt-2">
                Sign up to download and save
              </p>
            </div>

            {/* Caption / Mini brandbook */}
            <div className="glass-elevated rounded-2xl p-6 space-y-6">
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">
                Caption
              </h3>
              <div className="space-y-3">
                {result.caption.igCaption ? (
                  <p className="text-white whitespace-pre-wrap text-sm">{result.caption.igCaption}</p>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Hook</p>
                      <p className="text-white">{result.caption.hook}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Body</p>
                      <p className="text-zinc-300 text-sm">{result.caption.body}</p>
                    </div>
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">CTA</p>
                      <p className="text-white text-sm">{result.caption.cta}</p>
                    </div>
                    {Array.isArray(result.caption.hashtags) && result.caption.hashtags.length > 0 && (
                      <div>
                        <p className="text-xs text-zinc-500 mb-1">Hashtags</p>
                        <p className="text-cyan-400 text-sm">
                          {result.caption.hashtags.join(" ")}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <button
                onClick={() => {
                  setPhase("input");
                  setResult(null);
                  setBrandInput("");
                }}
                className="w-full py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
              >
                Try another brand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sign-up modal */}
      {showSignUpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSignUpModal(false)}
        >
          <div
            className="glass-elevated rounded-2xl p-8 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-white mb-2">
              Love this?
            </h3>
            <p className="text-zinc-400 mb-6">
              Save your Brand Space and download your post by creating a free account.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignUpModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                Maybe later
              </button>
              <Link
                href="/auth/signup"
                className="flex-1 py-3 rounded-xl gradient-ai text-white font-medium text-center hover:opacity-90 transition-opacity"
              >
                Create free account
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
