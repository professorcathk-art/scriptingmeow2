/**
 * Structured idea stored in user_post_ideas.content (JSON) from AI Idea Bank.
 */
export type StructuredIdeaV1 = {
  v: 1;
  summary: string;
  contentFocus: string;
  textOnImage: string;
  arrangement: string;
  visualAdvice: string;
};

export function parseStructuredIdea(content: string): StructuredIdeaV1 | null {
  const t = content.trim();
  if (!t.startsWith("{")) return null;
  try {
    const j = JSON.parse(t) as Record<string, unknown>;
    if (j.v === 1 && typeof j.contentFocus === "string") {
      return {
        v: 1,
        summary: String(j.summary ?? "").trim(),
        contentFocus: String(j.contentFocus ?? "").trim(),
        textOnImage: String(j.textOnImage ?? "").trim(),
        arrangement: String(j.arrangement ?? "").trim(),
        visualAdvice: String(j.visualAdvice ?? "").trim(),
      };
    }
  } catch {
    // ignore
  }
  return null;
}

/** Flatten structured idea for post content brief / create-post textarea. */
export function structuredIdeaToBrief(s: StructuredIdeaV1): string {
  const blocks = [
    s.contentFocus && `Content focus: ${s.contentFocus}`,
    s.textOnImage && `Text on image: ${s.textOnImage}`,
    s.arrangement && `Arrangement: ${s.arrangement}`,
    s.visualAdvice && `Visual direction: ${s.visualAdvice}`,
  ].filter(Boolean);
  return blocks.join("\n\n");
}

/** Full text for Idea Bank cards (expands structured JSON). */
export function formatIdeaForDisplay(content: string): string {
  const s = parseStructuredIdea(content);
  if (!s) return content;
  return [s.summary && `Summary: ${s.summary}`, `Focus: ${s.contentFocus}`, `Text on image: ${s.textOnImage}`, `Arrangement: ${s.arrangement}`, `Visual: ${s.visualAdvice}`]
    .filter(Boolean)
    .join("\n\n");
}

/** Short label for dropdowns (structured or plain). */
export function ideaListLabel(content: string, maxLen = 56): string {
  const structured = parseStructuredIdea(content);
  const base = structured?.summary || structured?.contentFocus || content;
  const oneLine = base.replace(/\s+/g, " ").trim();
  if (oneLine.length <= maxLen) return oneLine;
  return `${oneLine.slice(0, maxLen - 1)}…`;
}
