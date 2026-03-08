"use client";

import { PLAN_LIMITS, type PlanTier } from "@/types/database";
import { cn } from "@/lib/utils";

interface CreditDisplayProps {
  planTier: PlanTier;
  creditsRemaining: number;
  creditsResetDate: string;
  className?: string;
}

export function CreditDisplay({
  planTier,
  creditsRemaining,
  creditsResetDate,
  className,
}: CreditDisplayProps) {
  const limit = PLAN_LIMITS[planTier].monthly_credits;
  const percentage = (creditsRemaining / limit) * 100;
  const isLow = percentage < 20;
  const isCritical = percentage < 10;

  return (
    <div className={cn("rounded-lg border p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-gray-700">
            {planTier === "free" ? "Free Plan" : planTier === "starter" ? "Starter Plan" : "Creator Plan"}
          </p>
          <p className="text-xs text-gray-500">
            Resets {new Date(creditsResetDate).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{creditsRemaining}</p>
          <p className="text-xs text-gray-500">of {limit} credits</p>
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn(
            "h-2 rounded-full transition-all",
            isCritical
              ? "bg-red-500"
              : isLow
              ? "bg-yellow-500"
              : "bg-blue-500"
          )}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>
      {isLow && (
        <p className="text-xs text-red-600 mt-2">
          {isCritical
            ? "Credits running low! Consider upgrading."
            : "Credits running low."}
        </p>
      )}
    </div>
  );
}
