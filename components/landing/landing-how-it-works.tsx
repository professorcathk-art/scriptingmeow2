"use client";

const STEPS = [
  {
    title: "Define Your Brand DNA",
    description: "Create a Brand Space with your voice, tone, and visual style. AI learns your brand in seconds.",
  },
  {
    title: "Prompt the AI Studio",
    description: "Describe the post you want. Educational carousel, product launch, or testimonial—we&apos;ve got you.",
  },
  {
    title: "Publish Perfectly Consistent Content",
    description: "Download, schedule, or share. Every post stays on-brand, every time.",
  },
];

export function LandingHowItWorks() {
  return (
    <section className="py-24 px-4 bg-zinc-900/30">
      <div className="max-w-2xl mx-auto text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
          How it works
        </h2>
        <p className="text-zinc-400 text-lg">
          Three simple steps to consistent, on-brand content
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className="relative p-8 rounded-2xl bg-zinc-900/50 border border-white/10"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-[120px] font-bold text-zinc-500/20">
                {i + 1}
              </span>
            </div>
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 border border-white/10 flex items-center justify-center mb-6">
                <span className="text-xl font-bold text-white">{i + 1}</span>
              </div>
              <h3 className="text-xl font-semibold text-zinc-100 mb-3">
                {step.title}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
