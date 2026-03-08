"use client";

import "driver.js/dist/driver.css";
import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useProductTour } from "@/hooks/use-product-tour";

interface TourContextValue {
  startTour: () => void;
  registerOpenMobileMenu: (fn: () => void) => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const { startTour, registerOpenMobileMenu } = useProductTour();

  const value: TourContextValue = {
    startTour,
    registerOpenMobileMenu,
  };

  return (
    <TourContext.Provider value={value}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  return ctx;
}
