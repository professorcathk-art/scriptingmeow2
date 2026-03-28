"use client";

export function LandingDemoSection() {
  return (
    <section
      className="py-24 px-4"
      aria-label="Product features: RSS feeds to on-brand Instagram posts"
    >
      <div className="max-w-3xl mx-auto text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-zinc-100">
          Your entire content pipeline,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            automated.
          </span>
        </h2>
        <p className="text-gray-400 text-lg mt-4">
          Connect any RSS feed, apply your AI Brandbook, and generate weeks of
          perfectly on-brand Instagram posts in a single click.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-center justify-center mt-16 max-w-6xl mx-auto">
        {/* Step 1: Connect RSS Feeds */}
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8 flex-1 max-w-sm lg:max-w-none">
          <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 hover:-translate-y-1 hover:border-purple-500/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-400"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93V10.1Z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                1. Connect RSS Feeds
              </h3>
            </div>
            <div className="space-y-2 text-sm text-zinc-400 font-mono">
              <div className="h-3 w-full bg-zinc-700/50 rounded" />
              <div className="h-3 w-4/5 bg-zinc-700/40 rounded" />
              <div className="h-3 w-3/4 bg-zinc-700/30 rounded" />
            </div>
            <div className="mt-4 space-y-1.5 text-xs text-zinc-500">
              <p>• AI startup raises $10M</p>
              <p>• New marketing trends for 2026</p>
              <p>• Industry report: Q1 insights</p>
            </div>
          </div>

          {/* Connector */}
          <div className="hidden lg:flex flex-shrink-0 items-center text-purple-500/50">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                strokeDasharray="4 4"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </div>
        </div>

        {/* Step 2: AI Brandbook */}
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8 flex-1 max-w-sm lg:max-w-none">
          <div className="w-full bg-white/5 border border-purple-500/30 rounded-xl p-6 shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:-translate-y-1 hover:border-purple-500/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/30 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a4 4 0 004-4v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                2. AI Brandbook Applies Style
              </h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                {["#8b5cf6", "#ec4899", "#06b6d4"].map((color) => (
                  <div
                    key={color}
                    className="w-6 h-6 rounded-full border border-white/20"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                ))}
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Playfair Display
              </p>
              <span className="inline-block px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs">
                Tone: Authoritative
              </span>
            </div>
          </div>

          {/* Connector */}
          <div className="hidden lg:flex flex-shrink-0 items-center text-purple-500/50">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                strokeDasharray="4 4"
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </div>
        </div>

        {/* Step 3: Get Ready-to-Publish Posts */}
        <div className="flex-1 max-w-sm lg:max-w-none">
          <div className="w-full bg-white/5 border border-white/10 rounded-xl p-6 hover:-translate-y-1 hover:border-purple-500/50 transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">
                3. Get Ready-to-Publish Posts
              </h3>
            </div>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-1 aspect-square rounded-lg overflow-hidden border border-white/10 bg-gradient-to-br from-purple-900/40 via-zinc-800 to-pink-900/30"
                >
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-8 h-8 rounded border-2 border-white/20 border-dashed" />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-3 text-center">
              Cohesive, on-brand carousels
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
