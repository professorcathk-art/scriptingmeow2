import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BrandType } from "@/types/database";

export const BRAND_TYPE_LABELS: Record<BrandType, string> = {
  "personal-brand": "Personal Brand / Creator",
  "ecommerce-retail": "E-commerce / Retail",
  "service-agency": "Service Provider / Agency",
  "local-business": "Local Business / Brick & Mortar",
  "tech-startup": "Tech / Software / Startup",
  "community-nonprofit": "Community / Non-Profit",
  other: "Other",
};

const LEGACY_BRAND_TYPE_MAP: Record<string, string> = {
  shop: "E-commerce / Retail",
  agency: "Service Provider / Agency",
};

export function getBrandTypeLabel(
  brandType: string,
  otherSpecify?: string | null
): string {
  if (brandType === "other" && otherSpecify?.trim()) {
    return otherSpecify.trim();
  }
  return (
    BRAND_TYPE_LABELS[brandType as BrandType] ??
    LEGACY_BRAND_TYPE_MAP[brandType] ??
    brandType.replace(/-/g, " ")
  );
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
