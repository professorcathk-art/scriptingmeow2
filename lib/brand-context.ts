/**
 * Formats brand_details JSON (from brand_spaces) for AI prompts so drafts
 * include enough context for postAim and on-brand copy even without a brandbook row.
 */
export function formatBrandDetailsForPrompt(
  brandDetails: Record<string, unknown> | null | undefined
): string {
  if (!brandDetails || typeof brandDetails !== "object") return "";

  const toLines = (v: unknown): string => {
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string" && x.trim()).join("; ");
    if (typeof v === "string") return v.split("\n").map((s) => s.trim()).filter(Boolean).join("; ");
    return "";
  };

  const parts: string[] = [];
  const ta = toLines(brandDetails.targetAudiences);
  const pp = toLines(brandDetails.painPoints);
  const dout = toLines(brandDetails.desiredOutcomes);
  const vp = typeof brandDetails.valueProposition === "string" ? brandDetails.valueProposition.trim() : "";
  const other = typeof brandDetails.otherBrandType === "string" ? brandDetails.otherBrandType.trim() : "";

  if (ta) parts.push(`Target audiences: ${ta}`);
  if (pp) parts.push(`Audience pain points: ${pp}`);
  if (dout) parts.push(`Desired outcomes: ${dout}`);
  if (vp) parts.push(`Value proposition: ${vp}`);
  if (other) parts.push(`Other brand type note: ${other}`);

  return parts.join("\n");
}

/**
 * When the draft model omits `postAim`, derive a concise aim from the idea brief
 * so Step 3 never shows an empty Post Aim field.
 */
export function defaultPostAimFromBrief(enrichedIdea: string): string {
  const withoutContext = enrichedIdea.split(/\n--- Brand context/)[0]?.trim() || enrichedIdea;
  const withoutRef = withoutContext.split(/\n--- Reference/)[0]?.trim() || withoutContext;
  const normalized = withoutRef.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Communicate the post idea clearly and support the brand with a cohesive, on-message visual.";
  }
  const snippet = normalized.slice(0, 520);
  const suffix = normalized.length > 520 ? "…" : "";
  return `Communicate the core message clearly and support the brand; this post should deliver value on: ${snippet}${suffix}`;
}
