"use client";

export function LandingDemoSection() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
          The <span className="gradient-ai-text">&quot;Aha&quot;</span> moment
        </h2>
        <p className="text-zinc-400 text-lg">
          Describe your brand once. Get perfectly consistent posts every time.
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-6 shadow-2xl">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
              Brand Space / Prompt
            </p>
            <div className="space-y-4">
              <div className="h-6 bg-white/5 rounded-lg w-3/4" />
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-4 bg-white/5 rounded w-5/6" />
              <div className="h-4 bg-white/5 rounded w-4/5" />
              <div className="mt-6 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <span className="text-sm text-violet-400 font-medium">
                  AI generates your brandbook →
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`rounded-2xl border border-white/10 overflow-hidden bg-zinc-900/50 ${
                  i === 2 ? "col-span-2" : ""
                }`}
              >
                <div className="aspect-square bg-gradient-to-br from-violet-500/20 via-cyan-500/10 to-pink-500/20" />
                <div className="p-3">
                  <div className="h-2 bg-white/10 rounded w-2/3 mb-2" />
                  <div className="h-2 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-zinc-500 text-sm mt-4">
            AI-generated Instagram posts
          </p>
        </div>
      </div>
    </section>
  );
}
