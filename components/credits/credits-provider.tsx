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
  fourKCreditsRemaining: number;
  creditsResetDate: string;
  planTier: PlanTier;
  setCredits: (credits: number, resetDate?: string, planTier?: PlanTier) => void;
  setFourKCredits: (credits: number) => void;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

interface CreditsProviderProps {
  children: ReactNode;
  initialCredits: number;
  initialFourKCredits?: number;
  initialResetDate: string;
  initialPlanTier: PlanTier;
}

export function CreditsProvider({
  children,
  initialCredits,
  initialFourKCredits = 0,
  initialResetDate,
  initialPlanTier,
}: CreditsProviderProps) {
  const [creditsRemaining, setCreditsRemaining] = useState(initialCredits);
  const [fourKCreditsRemaining, setFourKCreditsRemaining] = useState(initialFourKCredits);
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

  const setFourKCredits = useCallback((credits: number) => {
    setFourKCreditsRemaining(credits);
  }, []);

  return (
    <CreditsContext.Provider
      value={{
        creditsRemaining,
        fourKCreditsRemaining,
        creditsResetDate,
        planTier,
        setCredits,
        setFourKCredits,
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
