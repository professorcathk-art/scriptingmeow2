/**
 * Builds the full image generation prompt including brandbook details,
 * visual advice, and text-on-image instructions.
 * Expert-level design guidance for professional IG posts.
 */

function stripMarkdown(s: string): string {
  return String(s || "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

const EDITORIAL_DESIGN_GUIDE = `
DESIGN REQUIREMENTS (follow strictly):
- Magazine-quality editorial layout. Sophisticated, not generic.
- Typography hierarchy: headline = largest, bold, impactful. Subheadline = medium, supporting. Body = readable, smaller.
- NEVER render markdown symbols (#, ##, ###, **). Render ONLY the actual text content.
- Text and image must feel integrated—consider overlay, transparency, or creative placement.
- Use brand colors for text accents or backgrounds. Professional contrast for readability.
- Spacing and alignment: clean, intentional. Avoid cramped or amateur layouts.
- Overall: scroll-stopping, premium, Instagram-worthy.`;

const LAYOUT_DESIGN_GUIDE: Record<string, string> = {
  editorial: `
EDITORIAL LAYOUT: Magazine-style. Text block with clear typographic hierarchy. Headline (line 1) = large, bold. Subheadline (line 2) = medium. Body (line 3+) = smaller, readable. Integrate with imagery—overlay, split, or framed. Professional, not stock-photo generic.`,
  "text-heavy": `
TEXT-HEAVY LAYOUT: One bold headline dominates. Large, impactful typography. Minimal supporting text. High contrast.`,
  "tweet-card": `
QUOTE CARD LAYOUT: Key quote or statement. Elegant typography. Card or frame treatment. Shareable, quote-worthy.`,
  "split-screen": `
SPLIT LAYOUT: Clear division—text on one side, image on other. Balanced composition. Headline + body.`,
  "immersive-photo": `
IMMERSIVE LAYOUT: Image-first. Minimal or no text overlay. Full-bleed feel.`,
};

type BrandbookVisualStyle = {
  primaryColor?: string;
  secondaryColor1?: string;
  secondaryColor2?: string;
  colors?: string[];
  mood?: string;
  imageStyle?: string;
  image_style?: string;
  layoutTendencies?: string;
  layoutStyle?: string;
  vibe?: string[];
} | null;

export function buildImagePrompt(options: {
  brandbook: {
    visual_style?: BrandbookVisualStyle;
    brand_personality?: string;
    tone_of_voice?: string;
  };
  visualAdvice: string;
  imageTextOnImage?: string;
  postStyle?: string;
  contentIdea?: string;
}): string {
  const vs = options.brandbook?.visual_style as BrandbookVisualStyle;
  const colors = vs?.primaryColor
    ? [vs.primaryColor, vs.secondaryColor1, vs.secondaryColor2].filter(Boolean).join(", ")
    : Array.isArray(vs?.colors)
      ? vs.colors.slice(0, 5).join(", ")
      : "";
  const mood = vs?.mood || "engaging";
  const imageStyle = vs?.imageStyle || vs?.image_style || "professional";
  const layoutTendencies = vs?.layoutTendencies || "";
  const layoutStyle = vs?.layoutStyle || "";

  const brandContext = [
    `Brand visual style: ${imageStyle}`,
    `Mood: ${mood}`,
    colors ? `Colors (use these): ${colors}` : "",
    layoutTendencies ? `Layout tendencies: ${layoutTendencies}` : "",
    layoutStyle ? `Layout: ${layoutStyle}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  const parts: string[] = [];

  parts.push(`Create a professional, scroll-stopping Instagram post. You are an expert in editorial design and IG content.`);

  if (brandContext) {
    parts.push(`BRAND BOOK (follow strictly): ${brandContext}`);
  }

  if (options.visualAdvice?.trim()) {
    parts.push(`視覺建議 / VISUAL ADVICE (follow strictly): ${options.visualAdvice.trim()}`);
  }

  if (options.contentIdea?.trim()) {
    parts.push(`Content theme: ${options.contentIdea.trim().slice(0, 150)}`);
  }

  const layout = options.postStyle || "editorial";
  const layoutGuide = LAYOUT_DESIGN_GUIDE[layout] || LAYOUT_DESIGN_GUIDE.editorial;
  parts.push(`Layout style: ${layout}.${layoutGuide}`);

  let basePrompt = parts.join("\n\n");
  if (!basePrompt.trim()) {
    basePrompt = `Professional Instagram post. Style: ${imageStyle}. Mood: ${mood}.${colors ? ` Use these colors: ${colors}.` : ""} High-quality, scroll-stopping visual.`;
  }

  const rawText = (options.imageTextOnImage ?? "").trim();
  const textOnImage = stripMarkdown(rawText);
  if (textOnImage) {
    const lines = textOnImage.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const textInstruction =
      lines.length >= 3
        ? `TEXT TO RENDER (editorial hierarchy): Line 1 (headline): "${lines[0]}". Line 2 (subheadline): "${lines[1]}". Line 3+ (body): "${lines.slice(2).join(" ")}".`
        : lines.length === 2
          ? `TEXT TO RENDER: Headline: "${lines[0]}". Subheadline: "${lines[1]}".`
          : `TEXT TO RENDER: "${textOnImage}".`;
    basePrompt += `\n\nCRITICAL - ${textInstruction} Render ONLY the actual text. NEVER show #, ##, ###, or **. Use proper typography hierarchy.`;
  }

  return basePrompt + EDITORIAL_DESIGN_GUIDE;
}
