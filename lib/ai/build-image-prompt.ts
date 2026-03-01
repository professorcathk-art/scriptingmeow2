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

const BASE_PROMPT =
  "Generate a high-end, scroll-stopping Instagram graphic. Act as a master Art Director and Editorial Designer. Every visual element must be polished, cohesive, and meticulously composed.";

const FINAL_DESIGN_COMMANDS = `
FINAL DESIGN COMMANDS (strictly enforce):
- Magazine-quality execution. Sophisticated, premium, and intentional.
- Perfect Typographic Hierarchy: The Headline must be the largest and boldest, immediately drawing the eye. Subheadlines are medium weight.
- Color Harmony: Use the defined brand colors strategically for text accents, shapes, or backgrounds. Ensure flawless contrast between text and background for mobile readability.
- Integration: Text and image must not fight for attention. Use intentional negative space, subtle gradients behind text, or creative overlay techniques to blend them smoothly.
- Spacing: Generous, clean margins. Avoid cramped, cluttered, or amateur layouts at all costs.`;

const LAYOUT_DESIGN_GUIDE: Record<string, string> = {
  editorial: `
VISUAL LAYOUT & SPATIAL RULES: editorial.
MINIMALIST EDITORIAL: Clean, high-end magazine aesthetic. High whitespace. Frame the subject beautifully using negative space. Text is elegantly integrated into the composition, not just slapped on top.`,
  "text-heavy": `
VISUAL LAYOUT & SPATIAL RULES: text-heavy.
TEXT-HEAVY / INFOGRAPHIC: The text is the hero. Use bold, highly legible typography against a clean, uncluttered background area or soft brand-color gradient to ensure perfect readability.`,
  "tweet-card": `
VISUAL LAYOUT & SPATIAL RULES: tweet-card.
TWEET / QUOTE CARD: Central stylized text block or UI-like card, resting on an aesthetically pleasing, soft background that matches the brand aura.`,
  "split-screen": `
VISUAL LAYOUT & SPATIAL RULES: split-screen.
SPLIT SCREEN / COLLAGE: Distinct visual zones (e.g., top/bottom or left/right) separating the subject/illustration from the text block. Use sharp, modern geometric divisions.`,
  "immersive-photo": `
VISUAL LAYOUT & SPATIAL RULES: immersive-photo.
IMMERSIVE VISUAL: Edge-to-edge premium illustration or photography. Text is minimal and acts as a subtle overlay placed specifically in a naturally empty/clean area of the image.`,
};

const CONTENT_FRAMEWORK_IMAGE_GUIDE: Record<string, string> = {
  "educational-value": "Content Goal: Educational/Value—teach, inform, actionable advice. Visual should support learning.",
  "engagement-relatable": "Content Goal: Engagement/Relatable—conversation-starter, shareable. Visual should feel relatable, meme-worthy or question-driven.",
  "promotional-proof": "Content Goal: Promotional/Proof—products, testimonials, sales. Visual should highlight offerings, social proof.",
  "storytelling": "Content Goal: Storytelling/Behind the Scenes—journey, team, process. Visual should feel authentic, narrative.",
};

type BrandbookVisualStyle = {
  primaryColor?: string;
  secondaryColor1?: string;
  secondaryColor2?: string;
  colors?: string[];
  imageStyle?: string;
  image_style?: string;
  carouselInnerStyle?: string;
  imageGenerationPrompt?: string;
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
  pageIndex?: number;
  logoUrl?: string | null;
  logoPlacement?: string | null;
  brandType?: string;
  otherBrandType?: string;
  contentFramework?: string;
}): string {
  const vs = options.brandbook?.visual_style as BrandbookVisualStyle;
  const pageIndex = options.pageIndex ?? 1;
  const isInnerPage = pageIndex > 1;
  const carouselInnerStyle = (vs as { carouselInnerStyle?: string })?.carouselInnerStyle?.trim();

  const imageGenPrompt = vs?.imageGenerationPrompt?.trim();
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

  const brandContextParts: string[] = [];
  if (isInnerPage && carouselInnerStyle) {
    brandContextParts.push(`CORE VISUAL IDENTITY (INNER PAGE): You are generating an inner carousel slide. The text is the hero. STRICTLY follow the inner page style: ${carouselInnerStyle}. Do NOT generate a complex, full-screen scene. Generate a clean, minimal background or use very subtle, small graphics to ensure maximum text readability. Scene directive: ${options.visualAdvice.trim() || "Clean, minimal background."}`);
  } else if (imageGenPrompt) {
    brandContextParts.push(`CORE VISUAL IDENTITY (COVER PAGE): Brand image generation prompt (use as primary style): ${imageGenPrompt}`);
  } else {
    brandContextParts.push(`CORE VISUAL IDENTITY (COVER PAGE): Use brand visual style: ${imageStyle}`);
    if (colorDescriptionDetailed) brandContextParts.push(`Color palette & lighting: ${colorDescriptionDetailed}`);
    if (visualAura) brandContextParts.push(`Visual aura & whitespace rules: ${visualAura}`);
    if (lineStyle) brandContextParts.push(`Line/stroke characteristics: ${lineStyle}`);
    if (layoutStyle) brandContextParts.push(`Layout rules: ${layoutStyle}`);
    if (typographySpec) brandContextParts.push(`Typography aesthetic: ${typographySpec}`);
    if (!colorDescriptionDetailed && colors) brandContextParts.push(`Colors (use these): ${colors}`);
  }
  const logoPlacement = options.logoPlacement;
  const showLogo = options.logoUrl && logoPlacement !== "none";
  if (showLogo) {
    const placementMap: Record<string, string> = {
      "top-left": "top-left corner",
      "top-center": "top center",
      "top-right": "top-right corner",
      "bottom-left": "bottom-left corner",
      "bottom-center": "bottom center",
      "bottom-right": "bottom-right corner",
    };
    const placement = placementMap[logoPlacement ?? ""] ?? "top-right corner";
    brandContextParts.push(`Include logo integration seamlessly in the ${placement} of the composition.`);
  }
  const brandContext = brandContextParts.length > 0
    ? `CORE VISUAL IDENTITY (MANDATORY):\n${brandContextParts.join("\n")}`
    : "";

  const parts: string[] = [BASE_PROMPT];

  if (options.brandType || options.contentFramework) {
    const brandTypeNote = options.brandType
      ? `Brand Type: ${options.brandType === "other" && options.otherBrandType ? options.otherBrandType : options.brandType}`
      : "";
    const contentNote = options.contentFramework && CONTENT_FRAMEWORK_IMAGE_GUIDE[options.contentFramework]
      ? CONTENT_FRAMEWORK_IMAGE_GUIDE[options.contentFramework]
      : "";
    if (brandTypeNote || contentNote) {
      parts.push(`CONTEXT & VIBE: ${[brandTypeNote, contentNote].filter(Boolean).join(". ")} Ensure the overall mood, lighting, and composition reflect this specific industry and intent.`);
    }
  }

  if (brandContext) {
    parts.push(brandContext);
  }

  if (options.visualAdvice?.trim() && !(isInnerPage && carouselInnerStyle)) {
    parts.push(`SCENE & SUBJECT ACTION (CRITICAL): ${options.visualAdvice.trim()}\n*Instruction: Merge this specific scene description seamlessly into the Core Visual Identity defined above. Do not alter the brand's art style to fit the scene; force the scene to match the brand's aesthetic medium and colors exactly.*`);
  }

  const layout = options.postStyle || "editorial";
  const layoutGuide = LAYOUT_DESIGN_GUIDE[layout] || LAYOUT_DESIGN_GUIDE.editorial;
  parts.push(layoutGuide);

  let basePrompt = parts.join("\n\n");
  if (!basePrompt.trim()) {
    basePrompt = `Professional Instagram post. Style: ${imageStyle}.${colors ? ` Use these colors: ${colors}.` : ""} High-quality, scroll-stopping visual.`;
  }

  const rawText = (options.imageTextOnImage ?? "").trim();
  const textOnImage = stripMarkdown(rawText);
  if (textOnImage) {
    const escaped = textOnImage.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    basePrompt += `\n\nEXACT TEXT TO RENDER (CRITICAL): Render the following text perfectly, with zero typos. Do NOT render markdown tags like #, ##, ###, or **. Preserve line breaks as given. Use typographic hierarchy appropriate to the content:\n"${escaped}"`;
  }

  return basePrompt + FINAL_DESIGN_COMMANDS;
}
