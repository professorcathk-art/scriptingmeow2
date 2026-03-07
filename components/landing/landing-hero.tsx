"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LANDING_STYLES } from "@/lib/landing-styles";
import { SaveStyleModal } from "./save-style-modal";

interface PublicDesign {
  id: string;
  image_url: string;
  content_idea?: string;
}

interface LandingHeroProps {
  isAuthenticated?: boolean;
  publicDesigns?: PublicDesign[];
  publicDesignCount?: number;
}

export function LandingHero({ isAuthenticated = false, publicDesigns = [], publicDesignCount = 0 }: LandingHeroProps) {
  const [scratchInput, setScratchInput] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<typeof LANDING_STYLES[0] | null>(null);

  const handleStartFromScratch = () => {
    const brandName = scratchInput.trim();
    if (isAuthenticated) {
      window.location.href = brandName
        ? `/brand-spaces/new?name=${encodeURIComponent(brandName)}`
        : "/brand-spaces/new";
    } else if (brandName) {
      window.location.href = `/auth/signup?redirect=${encodeURIComponent(`/brand-spaces/new?name=${encodeURIComponent(brandName)}`)}`;
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
      <section className="text-center max-w-4xl mx-auto mb-16">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight leading-tight">
          Designer-quality Instagram posts{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f472b6 100%)",
            }}
          >
            in seconds.
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-3xl mx-auto">
          Skip the blank canvas. Tell us your brand name below or steal a winning
          aesthetic from our gallery, and let AI generate your first complete post
          instantly.
        </p>
      </section>

      {/* CTA - before Steal a Style */}
      <section className="max-w-3xl mx-auto w-full mb-16">
        <div className="glass rounded-2xl p-6 sm:p-8 border border-white/10">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={scratchInput}
              onChange={(e) => setScratchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleStartFromScratch()}
              placeholder="Type your brandname to get started"
              className="flex-1 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-violet-500/50 transition-all shadow-inner"
            />
            <button
              type="button"
              onClick={handleStartFromScratch}
              className="px-6 py-3 rounded-xl gradient-ai text-white font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              Generate my first post ✨
            </button>
          </div>
        </div>
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
              <button
                type="button"
                onClick={() => setSelectedStyle(item)}
                className="group w-full text-left glass-elevated rounded-2xl overflow-hidden border border-white/5 hover:border-violet-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={item.imageUrl}
                    alt={item.category}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    priority={parseInt(item.id, 10) <= 4}
                  />
                  {/* Desktop: hover overlay. Mobile: always show tap hint */}
                  <div className="absolute inset-0 bg-black/40 sm:bg-black/60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white font-semibold text-sm shadow-lg sm:group-hover:scale-105 transition-all duration-200">
                      ✨ Save this Style
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium mb-2">
                    {item.category}
                  </span>
                  <p className="text-zinc-500 text-sm">&quot;{item.testimonial}&quot;</p>
                </div>
              </button>
            </div>
          ))}
          {publicDesigns.map((design) => (
            <Link
              key={design.id}
              href={`/discover/${design.id}`}
              className="group block break-inside-avoid mb-4"
            >
              <div className="w-full text-left glass-elevated rounded-2xl overflow-hidden border border-white/5 hover:border-violet-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-300">
                <div className="relative aspect-[4/5] overflow-hidden">
                  <Image
                    src={design.image_url}
                    alt={design.content_idea?.slice(0, 60) ?? "Community design"}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    unoptimized={design.image_url.startsWith("data:")}
                  />
                  <div className="absolute inset-0 bg-black/40 sm:bg-black/60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 text-white font-semibold text-sm shadow-lg">
                      View design
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <span className="inline-block px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-medium mb-2">
                    Community
                  </span>
                  <p className="text-zinc-500 text-sm line-clamp-2">{design.content_idea?.slice(0, 80)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {publicDesignCount > 50 && (
          <div className="mt-6 text-center">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-violet-500/30 text-violet-400 hover:bg-violet-500/10 transition-colors font-medium"
            >
              View all community designs
            </Link>
          </div>
        )}
      </section>

      {selectedStyle && (
        <SaveStyleModal
          item={selectedStyle}
          onClose={() => setSelectedStyle(null)}
          isAuthenticated={isAuthenticated}
        />
      )}
    </div>
  );
}
