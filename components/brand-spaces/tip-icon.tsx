"use client";

import { useState, useRef, useEffect } from "react";

const BRAND_FIELD_TIPS: Record<string, string> = {
  targetAudiences: `Be specific: include demographics (age, location, industry), psychographics (values, lifestyle), and behaviors. Think about their job titles, pain points, and where they spend time online. Example: "SaaS founders aged 30-45 who want to scale without burning out."`,
  painPoints: `What keeps them up at night? What frustrates them daily? Capture both emotional and practical challenges. The more specific you are, the better your content can speak directly to their situation.`,
  desiredOutcomes: `What do they want to achieve? (e.g., more time, more revenue, confidence, clarity.) What transformation are they seeking? Connect these outcomes to how your brand helps them get there.`,
  valueProposition: `What unique benefit do you provide that competitors don't? Use the formula: "For [audience] who [need], we provide [solution] that [benefit]." Keep it concise and memorable—one sentence that captures why someone should choose you.`,
};

interface TipIconProps {
  fieldKey: keyof typeof BRAND_FIELD_TIPS;
  className?: string;
}

export function TipIcon({ fieldKey, className = "" }: TipIconProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const tip = BRAND_FIELD_TIPS[fieldKey];
  if (!tip) return null;

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-white/20 text-zinc-400 hover:text-violet-400 hover:border-violet-500/50 transition-colors"
        aria-label="Show tips"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 p-3 rounded-lg bg-zinc-800 border border-white/10 text-sm text-zinc-300 shadow-xl">
          <p className="leading-relaxed">{tip}</p>
          <div className="absolute -top-1 left-4 w-2 h-2 rotate-45 bg-zinc-800 border-l border-t border-white/10" />
        </div>
      )}
    </div>
  );
}
