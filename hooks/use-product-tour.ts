"use client";

import { useCallback, useRef } from "react";
import { driver, type Driver } from "driver.js";

const TOUR_STEPS = [
  {
    element: "#tour-brand-spaces",
    popover: {
      title: "1. Create Your Visual DNA",
      description:
        "Brand Spaces are where you define your brand identity. Create a brand space, add a brandbook with your voice and style, and our AI will learn your visual language for consistent posts.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-create-post",
    popover: {
      title: "2. Generate Stunning Posts",
      description:
        "Create single images or carousels. Enter your content idea, pick a format, and our AI generates on-brand visuals with your logo and style. Toggle 4K for premium resolution.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-bulk-create",
    popover: {
      title: "3. Scale with AI Bulk Create",
      description:
        "Generate multiple posts at once from templates or ideas. Perfect for content calendars and batch production. Save time while keeping your brand consistent.",
      side: "right" as const,
      align: "start" as const,
    },
  },
  {
    element: "#tour-library",
    popover: {
      title: "4. Your Creative Library",
      description:
        "All your generated posts, references, and ideas in one place. Browse, organize, and reuse assets. Export and manage your content with ease.",
      side: "right" as const,
      align: "start" as const,
    },
  },
];

export function useProductTour() {
  const driverRef = useRef<Driver | null>(null);
  const openMobileMenuRef = useRef<(() => void) | null>(null);

  const registerOpenMobileMenu = useCallback((fn: () => void) => {
    openMobileMenuRef.current = fn;
  }, []);

  const startTour = useCallback(() => {
    if (driverRef.current?.isActive()) return;

    driverRef.current = driver({
      animate: true,
      showProgress: true,
      progressText: "{{current}} of {{total}}",
      nextBtnText: "Next →",
      prevBtnText: "← Back",
      doneBtnText: "Let's Go ✨",
      popoverClass: "driver-popover-dark",
      overlayOpacity: 0.7,
      smoothScroll: true,
      allowClose: true,
      onHighlightStarted: (_element, step, _opts) => {
        const el = typeof step.element === "string" ? document.querySelector(step.element) : null;
        if (el && typeof window !== "undefined" && window.innerWidth < 768) {
          openMobileMenuRef.current?.();
        }
      },
      steps: TOUR_STEPS,
    });

    driverRef.current.drive();
  }, []);

  return { startTour, registerOpenMobileMenu };
}
