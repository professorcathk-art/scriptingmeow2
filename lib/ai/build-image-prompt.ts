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
MINIMALIST EDITORIAL: Clean, magazine-like design with plenty of white space and elegant typography. Headline (line 1) = large, bold. Subheadline (line 2) = medium. Body (line 3+) = smaller, readable. Integrate with imagery—overlay, split, or framed.`,
  "text-heavy": `
TEXT-HEAVY / CAROUSEL: Bold, easy-to-read typography taking center stage. One bold headline dominates. Perfect for step-by-step guides. High contrast.`,
  "tweet-card": `
TWEET / QUOTE CARD: Stylized social media post or quote on attractive background. Elegant typography. Card or frame treatment. Shareable, quote-worthy.`,
  "split-screen": `
SPLIT SCREEN / COLLAGE: Dynamic mix of multiple images or side-by-side comparison with text areas. Clear division—text on one side, image on other. Balanced composition.`,
  "immersive-photo": `
IMMERSIVE VISUAL: Focuses entirely on high-quality photography or graphics with minimal text overlay. Full-bleed feel. Image-first.`,
};

const CONTENT_FRAMEWORK_IMAGE_GUIDE: Record<string, string> = {
  "educational-value": "Content goal: Educational/Value—teach, inform, actionable advice. Visual should support learning.",
  "engagement-relatable": "Content goal: Engagement/Relatable—conversation-starter, shareable. Visual should feel relatable, meme-worthy or question-driven.",
  "promotional-proof": "Content goal: Promotional/Proof—products, testimonials, sales. Visual should highlight offerings, social proof.",
  "storytelling": "Content goal: Storytelling/Behind the Scenes—journey, team, process. Visual should feel authentic, narrative.",
};

type BrandbookVisualStyle = {
  primaryColor?: string;
  secondaryColor1?: string;
  secondaryColor2?: string;
  colors?: string[];
  imageStyle?: string;
  image_style?: string;
  colorDescriptionDetailed?: string;
  visualAura?: string;
  lineStyle?: string;
  layoutTendencies?: string;
  layoutStyle?: string;
  typographySpec?: string;
  layoutStyleDetail?: string;
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
  logoUrl?: string | null;
  brandType?: string;
  otherBrandType?: string;
  contentFramework?: string;
}): string {
  const vs = options.brandbook?.visual_style as BrandbookVisualStyle;
  const colors = vs?.primaryColor
    ? [vs.primaryColor, vs.secondaryColor1, vs.secondaryColor2].filter(Boolean).join(", ")
    : Array.isArray(vs?.colors)
      ? vs.colors.slice(0, 5).join(", ")
      : "";
  const imageStyle = vs?.imageStyle || vs?.image_style || "professional";
  const colorDescriptionDetailed = (vs as { colorDescriptionDetailed?: string })?.colorDescriptionDetailed || "";
  const visualAura = (vs as { visualAura?: string })?.visualAura || "";
  const lineStyle = (vs as { lineStyle?: string })?.lineStyle || "";
  const layoutTendencies = vs?.layoutTendencies || "";
  const layoutStyle = vs?.layoutStyle || "";
  const typographySpec = vs?.typographySpec || "";
  const layoutStyleDetail = vs?.layoutStyleDetail || "";

  const brandContext = [
    `Brand visual style: ${imageStyle}`,
    colorDescriptionDetailed ? `Color spec (follow strictly): ${colorDescriptionDetailed}` : colors ? `Colors (use these): ${colors}` : "",
    visualAura ? `Visual aura: ${visualAura}` : "",
    lineStyle ? `Line style: ${lineStyle}` : "",
    layoutTendencies ? `Layout tendencies: ${layoutTendencies}` : "",
    layoutStyle ? `Layout: ${layoutStyle}` : "",
    typographySpec ? `Typography: ${typographySpec}` : "",
    layoutStyleDetail ? `Layout detail: ${layoutStyleDetail}` : "",
    options.logoUrl ? "Include the brand logo in the image (user has provided a logo—place it appropriately, e.g. corner or watermark)." : "",
  ]
    .filter(Boolean)
    .join(". ");

  const parts: string[] = [];

  parts.push(`Create a professional, scroll-stopping Instagram post. You are an expert in editorial design and IG content.`);

  if (options.brandType || options.contentFramework) {
    const brandTypeNote = options.brandType
      ? `Brand type: ${options.brandType === "other" && options.otherBrandType ? options.otherBrandType : options.brandType}.`
      : "";
    const contentNote = options.contentFramework && CONTENT_FRAMEWORK_IMAGE_GUIDE[options.contentFramework]
      ? CONTENT_FRAMEWORK_IMAGE_GUIDE[options.contentFramework]
      : "";
    if (brandTypeNote || contentNote) {
      parts.push(`USER CHOICES (reflect in output): ${[brandTypeNote, contentNote].filter(Boolean).join(" ")}`);
    }
  }

  if (brandContext) {
    parts.push(`BRAND BOOK (follow strictly): ${brandContext}`);
  }

  if (options.visualAdvice?.trim()) {
    parts.push(`視覺建議 / VISUAL ADVICE (follow strictly): ${options.visualAdvice.trim()}`);
  }

  const layout = options.postStyle || "editorial";
  const layoutGuide = LAYOUT_DESIGN_GUIDE[layout] || LAYOUT_DESIGN_GUIDE.editorial;
  parts.push(`Visual layout (user chose): ${layout}.${layoutGuide}`);

  let basePrompt = parts.join("\n\n");
  if (!basePrompt.trim()) {
    basePrompt = `Professional Instagram post. Style: ${imageStyle}.${colors ? ` Use these colors: ${colors}.` : ""} High-quality, scroll-stopping visual.`;
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
