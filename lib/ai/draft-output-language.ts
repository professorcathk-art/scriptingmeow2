/**
 * Fragments prepended to draft-generation prompts (Gemini) so outputs match
 * the user's language and carousel on-image copy feels like a director's brief.
 */

/** Natural-language shot list for carousel slides (avoids rigid Headline/Subhead/Body). */
export const DRAFT_CAROUSEL_ON_IMAGE_STYLE = `## CAROUSEL: ON-IMAGE BRIEF (STYLE)
For each page's \`imageTextOnImage\`, treat the field as a **creative shot list**, not a form. Describe **where** each piece of type sits, **how prominent** it is, and the **exact wording**—for example: upper third centered (large hero line), bottom-right (small supporting line), label over the subject, band across the lower fifth, etc. Separate elements with newlines; use \\n inside JSON strings when needed.

Do **not** default to a stiff "Headline: … / Subhead: … / Body: …" block unless the layout truly calls for it. That pattern reads robotic; prefer fluid, placement-first instructions.

`;

/**
 * Strong language lock for all draft JSON fields.
 */
export function draftOutputLanguageInstruction(language: string): string {
  const lang = (language || "English").trim();
  const lower = lang.toLowerCase();

  if (lower.includes("bilingual")) {
    return `## OUTPUT LANGUAGE (MANDATORY)
The user selected: **${lang}**. Use English and Chinese together in a natural, audience-appropriate mix across \`postAim\`, \`igCaption\`, every \`imageTextOnImage\`, carousel \`header\` values, and \`visualAdvice\` (write the creative brief in the same bilingual spirit).

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
- Every \`imageTextOnImage\` value (the exact words that will appear on the graphic)
- Any carousel \`header\` field
- \`visualAdvice\`: write the full scene, layout, and lighting brief in **${lang}** so the draft is self-consistent for the user.${scriptNote}

Only keep English for unavoidable proper nouns, product names, or short quoted fragments from a source URL. Do **not** write the main caption or on-image copy in English when **${lang}** is not English.

---

`;
}
