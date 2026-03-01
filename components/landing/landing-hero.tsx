"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LANDING_STYLES } from "@/lib/landing-styles";
import { TryStyleModal } from "./try-style-modal";

interface LandingHeroProps {
  isAuthenticated?: boolean;
}

export function LandingHero({ isAuthenticated = false }: LandingHeroProps) {
  const [scratchInput, setScratchInput] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<typeof LANDING_STYLES[0] | null>(null);

  const handleStartFromScratch = () => {
    if (scratchInput.trim()) {
      // Could navigate to signup with brand description
      window.location.href = `/auth/signup?brand=${encodeURIComponent(scratchInput.trim())}`;
    } else {
      window.location.href = "/auth/signup";
    }
  };

  return (
    <div className="min-h-screen flex flex-col px-4 pt-20 pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-20 glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">
            designermeow
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

      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-tight">
          Turn your brand into viral{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f472b6 100%)",
            }}
          >
            Instagram posts
          </span>
          .
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Don&apos;t know where to start? Steal a winning aesthetic from our
          gallery below, tell us your brand name, and let AI do the rest.
        </p>
      </section>

      {/* Steal a Style Gallery */}
      <section className="max-w-6xl mx-auto w-full mb-20">
        <h2 className="text-xl font-semibold text-zinc-300 mb-6 text-center sm:text-left">
          Steal a Style
        </h2>
        <div
          className="columns-2 sm:columns-3 gap-4 space-y-4"
          style={{ columnFill: "balance" }}
        >
          {LANDING_STYLES.map((item) => (
            <div
              key={item.id}
              className="break-inside-avoid mb-4 group"
            >
              <div className="glass-elevated rounded-2xl overflow-hidden border border-white/5 hover:border-violet-500/30 transition-all duration-300">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.category}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => setSelectedStyle(item)}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white font-semibold text-sm shadow-lg hover:shadow-violet-500/30 hover:scale-105 transition-all duration-200"
                    >
                      ✨ Use this Style
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium mb-2">
                    {item.category}
                  </span>
                  <p className="text-zinc-500 text-sm">&quot;{item.testimonial}&quot;</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedStyle && (
        <TryStyleModal
          item={selectedStyle}
          onClose={() => setSelectedStyle(null)}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Fallback CTA */}
      <section className="max-w-2xl mx-auto w-full">
        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
          <p className="text-zinc-300 font-medium mb-4 text-center">
            Already know exactly what you want?
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={scratchInput}
              onChange={(e) => setScratchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartFromScratch()}
              placeholder="Describe your brand..."
              className="flex-1 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
            />
            <button
              type="button"
              onClick={handleStartFromScratch}
              className="px-6 py-3 rounded-xl gradient-ai text-white font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Start from Scratch
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
