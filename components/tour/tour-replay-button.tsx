"use client";

import { useTour } from "./tour-provider";

export function TourReplayButton() {
  const tour = useTour();
  const startTour = tour?.startTour;

  return (
    <button
      type="button"
      onClick={() => startTour?.()}
      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="hidden lg:inline">App Tutorial</span>
    </button>
  );
}
