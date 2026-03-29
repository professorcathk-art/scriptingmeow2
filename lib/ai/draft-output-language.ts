/**
 * Fragments prepended to draft-generation prompts (Gemini) so outputs match
 * the user's language and carousel **overallDesign** reads as one coherent brief.
 */

/** Emphasize unified overallDesign per carousel page (scene + copy together). */
export const DRAFT_CAROUSEL_ON_IMAGE_STYLE = `## CAROUSEL: OVERALL DESIGN (REMINDER)
Each page's \`overallDesign\` must describe the **whole** slide: setting and subjects/objects, composition, and **all** text (where it sits and what it says). Do not treat "text" as separate from "picture"—they are one brief. Use newlines to separate elements; use \\n inside JSON strings when needed.

`;

/**
 * Strong language lock for all draft JSON fields.
 */
export function draftOutputLanguageInstruction(language: string): string {
  const lang = (language || "English").trim();
  const lower = lang.toLowerCase();

  if (lower.includes("bilingual")) {
    return `## OUTPUT LANGUAGE (MANDATORY)
The user selected: **${lang}**. Use English and Chinese together in a natural, audience-appropriate mix across \`postAim\`, \`igCaption\`, every \`overallDesign\`, every \`styling\`, and carousel \`header\` values.

---

`;
  }

  const zhTraditional =
    lower.includes("traditional chinese") || /\b繁體|繁体/.test(lang);
  const zhSimplified =
    lower.includes("simplified chinese") || /\b简体|簡體/.test(lang);

  const scriptNote = zhTraditional
    ? " Use **Traditional Chinese (繁體中文)** characters for all user-facing strings below—not English."
    : zhSimplified
      ? " Use **Simplified Chinese** characters for all user-facing strings below—not English."
      : "";

  return `## OUTPUT LANGUAGE (MANDATORY — APPLY BEFORE WRITING JSON)
The user selected: **${lang}**.

Write **all** of the following entirely in **${lang}** (no English defaults):
- \`postAim\`
- \`igCaption\`
- Every \`overallDesign\` value (full slide brief, including any words that appear on the image)
- Every \`styling\` value (brand look / execution notes)
- Any carousel \`header\` field${scriptNote}

Only keep English for unavoidable proper nouns, product names, or short quoted fragments from a source URL. Do **not** write the main caption or design brief in English when **${lang}** is not English.

---

`;
}
