"use client";

const LOGOS = [
  "Professor Cat",
  "TenthProject",
  "Sito",
  "Morna Crystal",
  "Lifelab",
  "Designermeow",
];

export function LandingLogoCloud() {
  return (
    <section
      className="py-16 border-y border-white/5"
      aria-label="Social proof: creators and brands"
    >
      <h2 className="text-center text-zinc-300 text-lg sm:text-xl font-semibold mb-2 tracking-wide">
        Trusted by creators and brands
      </h2>
      <p className="text-center text-zinc-500 text-sm mb-8 tracking-wide">
        10,000+ teams use AI-first design workflows like designermeow
      </p>
      <div className="relative overflow-hidden">
        <div className="flex animate-scroll gap-16">
          {[...LOGOS, ...LOGOS].map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="flex-shrink-0 text-lg font-semibold text-zinc-500/60 whitespace-nowrap"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
