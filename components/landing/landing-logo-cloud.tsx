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
    <section className="py-16 border-y border-white/5">
      <p className="text-center text-zinc-400 text-sm mb-8 tracking-wide">
        Trusted by 10,000+ creators and brands
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
