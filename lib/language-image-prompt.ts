/**
 * Maps user-selected post language to instructions for the image model
 * (on-image text and scene-appropriate copy).
 */
export function languageInstructionForImage(language: string): string {
  const raw = (language || "English").trim();
  const lower = raw.toLowerCase();

  if (lower.includes("bilingual") || lower.includes("english + chinese")) {
    return `LANGUAGE (CRITICAL): Use BOTH English and Traditional Chinese for any text rendered on the image when appropriate—bilingual headlines, subheads, or paired lines. Both languages must be legible and intentional; do not output English-only if the user asked for bilingual.`;
  }
  if (lower.includes("traditional chinese") || raw === "繁體中文") {
    return `LANGUAGE (CRITICAL): All text on the image must be in Traditional Chinese.`;
  }
  if (lower.includes("simplified chinese") || raw === "简体中文") {
    return `LANGUAGE (CRITICAL): All text on the image must be in Simplified Chinese.`;
  }
  if (lower === "spanish") return `LANGUAGE (CRITICAL): All text on the image must be in Spanish.`;
  if (lower === "french") return `LANGUAGE (CRITICAL): All text on the image must be in French.`;
  if (lower === "german") return `LANGUAGE (CRITICAL): All text on the image must be in German.`;
  if (lower === "japanese") return `LANGUAGE (CRITICAL): All text on the image must be in Japanese.`;
  if (lower === "korean") return `LANGUAGE (CRITICAL): All text on the image must be in Korean.`;
  if (lower === "portuguese") return `LANGUAGE (CRITICAL): All text on the image must be in Portuguese.`;
  if (lower === "italian") return `LANGUAGE (CRITICAL): All text on the image must be in Italian.`;
  if (lower === "dutch") return `LANGUAGE (CRITICAL): All text on the image must be in Dutch.`;

  return `LANGUAGE (CRITICAL): All text on the image must be in ${raw}.`;
}
