"use client";

import { useEffect } from "react";
import { useTour } from "./tour-provider";

const HAS_SEEN_TOUR_KEY = "hasSeenTour";
const AUTO_START_DELAY_MS = 1500;

export function TourAutoStarter() {
  const tour = useTour();
  const startTour = tour?.startTour;

  useEffect(() => {
    if (typeof window === "undefined" || !startTour) return;

    const hasSeen = localStorage.getItem(HAS_SEEN_TOUR_KEY);
    if (hasSeen === "true") return;

    // Only auto-start on desktop; on mobile user can tap "App Tutorial" (menu must be open)
    const isMobile = window.innerWidth < 768;
    if (isMobile) return;

    const timer = setTimeout(() => {
      startTour();
      localStorage.setItem(HAS_SEEN_TOUR_KEY, "true");
    }, AUTO_START_DELAY_MS);

    return () => clearTimeout(timer);
  }, [startTour]);

  return null;
}
