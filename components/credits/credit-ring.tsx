"use client";

import { PLAN_LIMITS } from "@/types/database";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useCredits } from "./credits-provider";

interface CreditRingProps {
  className?: string;
}

export function CreditRing({ className }: CreditRingProps = {}) {
  const ctx = useCredits();
  const planTier = ctx?.planTier ?? "free";
  const creditsRemaining = ctx?.creditsRemaining ?? 0;
  const creditsResetDate = ctx?.creditsResetDate ?? new Date().toISOString();
  const limit = PLAN_LIMITS[planTier].monthly_credits;
  const percentage = Math.min((creditsRemaining / limit) * 100, 100);
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const isLow = percentage < 20;
  const isCritical = percentage < 10;

  return (
    <div className={cn("flex items-center gap-3 sm:gap-4", className)}>
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-white/10"
          />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(
              "transition-all duration-500",
              isCritical
                ? "stroke-red-500"
                : isLow
                ? "stroke-amber-500"
                : "stroke-violet-500"
            )}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-base sm:text-lg font-bold text-white">{creditsRemaining}</span>
        </div>
      </div>
      <div className="hidden sm:block">
        <p className="text-sm font-medium text-white">
          {planTier === "free" ? "Free" : planTier === "starter" ? "Starter" : "Creator"} Plan
        </p>
        <p className="text-xs text-zinc-500">
          Resets {new Date(creditsResetDate).toLocaleDateString()}
        </p>
        <Link
          href="/billing"
          className="text-xs text-violet-400 hover:text-violet-300 mt-0.5 inline-block"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}
