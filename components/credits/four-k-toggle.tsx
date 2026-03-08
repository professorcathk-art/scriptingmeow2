"use client";

import Link from "next/link";

interface FourKToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  fourKCreditsRemaining: number;
  disabled?: boolean;
}

export function FourKToggle({
  enabled,
  onChange,
  fourKCreditsRemaining,
  disabled = false,
}: FourKToggleProps) {
  const has4KCredits = fourKCreditsRemaining > 0;
  const isDisabled = disabled || !has4KCredits;

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <label className={`flex items-start gap-3 ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
        <div className="relative mt-0.5 shrink-0">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
            disabled={isDisabled}
            className="peer sr-only"
          />
          <div
            className={`block h-6 w-11 rounded-full transition-colors ${
              isDisabled ? "bg-zinc-700" : "bg-zinc-700 peer-checked:bg-violet-500"
            }`}
          />
          <div
            className={`pointer-events-none absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 ${
              isDisabled ? "opacity-50" : ""
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-zinc-100">
            ✨ Generate in 4K Resolution
          </span>
          {has4KCredits ? (
            <p className="mt-1 text-xs text-zinc-400">
              Uses 1 standard credit + 1 4K upgrade credit. ({fourKCreditsRemaining} 4K upgrades
              remaining)
            </p>
          ) : (
            <p className="mt-1 text-xs text-zinc-400">
              Upgrade your plan to generate in 4K.{" "}
              <Link href="/pricing" className="text-violet-400 hover:text-violet-300 underline">
                View pricing
              </Link>
            </p>
          )}
        </div>
      </label>
    </div>
  );
}
