"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { PlanTier } from "@/types/database";

interface CreditsContextValue {
  creditsRemaining: number;
  creditsResetDate: string;
  planTier: PlanTier;
  setCredits: (credits: number, resetDate?: string, planTier?: PlanTier) => void;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

interface CreditsProviderProps {
  children: ReactNode;
  initialCredits: number;
  initialResetDate: string;
  initialPlanTier: PlanTier;
}

export function CreditsProvider({
  children,
  initialCredits,
  initialResetDate,
  initialPlanTier,
}: CreditsProviderProps) {
  const [creditsRemaining, setCreditsRemaining] = useState(initialCredits);
  const [creditsResetDate, setCreditsResetDate] = useState(initialResetDate);
  const [planTier, setPlanTier] = useState(initialPlanTier);

  const setCredits = useCallback(
    (credits: number, resetDate?: string, tier?: PlanTier) => {
      setCreditsRemaining(credits);
      if (resetDate) setCreditsResetDate(resetDate);
      if (tier) setPlanTier(tier);
    },
    []
  );

  return (
    <CreditsContext.Provider
      value={{
        creditsRemaining,
        creditsResetDate,
        planTier,
        setCredits,
      }}
    >
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  return ctx;
}
