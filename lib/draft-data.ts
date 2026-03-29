/**
 * Canonical draft fields for image generation:
 * - overallDesign: full creative brief (scene, subjects, objects, composition, all on-image text)
 * - styling: brand-aligned look (palette, mood, medium, light, typography feel)
 *
 * Legacy fields imageTextOnImage + visualAdvice are still read for older saved drafts.
 */

import { MAX_STYLING_CHARS } from "@/lib/constants";

export { MAX_STYLING_CHARS };

export type DraftCarouselPageFields = {
  pageIndex: number;
  header: string;
  overallDesign: string;
  styling: string;
};

/** Merge legacy split fields (scene + on-image copy) into one overall brief. */
export function mergeLegacyDraftToOverall(visualAdvice: string, imageTextOnImage: string): string {
  const scene = (visualAdvice ?? "").trim();
  const text = (imageTextOnImage ?? "").trim();
  if (scene && text) return `${scene}\n\n${text}`;
  return scene || text;
}

export function readOverallDesign(row: Record<string, unknown> | null | undefined): string {
  if (!row) return "";
  const v = row.overallDesign ?? row.imageTextOnImage ?? row.imageText;
  return String(v ?? "").trim();
}

export function readStyling(row: Record<string, unknown> | null | undefined): string {
  if (!row) return "";
  const v = row.styling ?? row.visualAdvice ?? row.nanoBananaPrompt;
  return String(v ?? "").trim();
}

/** Normalize a single-image or carousel page row from API/DB/localStorage. */
export function normalizeDraftPageRow(row: Record<string, unknown>): {
  overallDesign: string;
  styling: string;
} {
  let overall = readOverallDesign(row);
  const styling = readStyling(row);
  if (!overall && (row.visualAdvice != null || row.imageTextOnImage != null)) {
    overall = mergeLegacyDraftToOverall(
      String(row.visualAdvice ?? ""),
      String(row.imageTextOnImage ?? "")
    );
  }
  return { overallDesign: overall, styling };
}

/** Full carousel slide row with legacy key migration. */
export function normalizeCarouselDraftPage(row: Record<string, unknown>): DraftCarouselPageFields {
  const { overallDesign, styling } = normalizeDraftPageRow(row);
  const pageIndex =
    typeof row.pageIndex === "number"
      ? row.pageIndex
      : Number(row.pageIndex) || 0;
  return {
    pageIndex,
    header: String(row.header ?? ""),
    overallDesign,
    styling,
  };
}

export function draftDataHasRenderableDraft(d: Record<string, unknown> | null | undefined): boolean {
  if (!d) return false;
  if ("carouselPages" in d && Array.isArray(d.carouselPages)) return true;
  if ("overallDesign" in d || "styling" in d) return true;
  if ("visualAdvice" in d || "imageTextOnImage" in d) return true;
  return false;
}
