"use client";

import Image from "next/image";

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
          <div className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
            <Image
              src="/landing-demo/brand-space.png"
              alt="Brand Space / Prompt"
              width={600}
              height={400}
              className="w-full h-auto object-cover"
            />
            <div className="bg-zinc-900/50 p-4 border-t border-white/10">
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                Brand Space / Prompt
              </p>
              <p className="text-sm text-violet-400 font-medium">
                AI generates your brandbook →
              </p>
            </div>
          </div>
        </div>

        <div className="order-1 md:order-2">
          <div className="grid grid-cols-2 gap-4">
            {["post-1", "post-2", "post-3"].map((name, i) => (
              <div
                key={name}
                className={`rounded-2xl border border-white/10 overflow-hidden bg-zinc-900/50 ${
                  i === 1 ? "col-span-2" : ""
                }`}
              >
                <div className="relative aspect-[4/5]">
                  <Image
                    src={`/landing-demo/${name}.png`}
                    alt={`AI-generated post ${i + 1}`}
                    fill
                    className="object-cover"
                  />
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
