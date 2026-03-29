/**
 * Builds the full image generation prompt including brandbook details,
 * visual advice, and text-on-image instructions.
 * Expert-level design guidance for professional IG posts.
 */

import { languageInstructionForImage } from "@/lib/language-image-prompt";

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

/**
 * Prepare on-image brief for the image model: strip markdown; strip legacy typography
 * role labels (Chinese/English) so they are not painted as visible words; preserve
 * placement lines and freeform instructions verbatim.
 */
function prepareOnImageBriefForModel(rawText: string): string {
  if (!rawText) return "";

  const cleaned = stripMarkdown(rawText);
  const lines = cleaned.split(/\n/);
  const contentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const headlineMatch = trimmed.match(/^(?:主標題|大標題|Headline)[：:]\s*(.*)$/i);
    const subheadMatch = trimmed.match(/^(?:副標題|小標題|Subhead|Subheadline)[：:]\s*(.*)$/i);
    const bodyMatch = trimmed.match(/^(?:內文|Body)[：:]\s*(.*)$/i);

    if (headlineMatch) {
      contentLines.push(headlineMatch[1].trim());
    } else if (subheadMatch) {
      contentLines.push(subheadMatch[1].trim());
    } else if (bodyMatch) {
      contentLines.push(bodyMatch[1].trim());
    } else {
      contentLines.push(trimmed);
    }
  }

  return contentLines.join("\n");
}

const BASE_PROMPT =
  "Generate a high-end, scroll-stopping Instagram graphic. Act as a master Art Director and Editorial Designer. Every visual element must be polished, cohesive, and meticulously composed.";

const DESIGN_PRIORITY =
  "DESIGN PRIORITY: Brandbook colors and reference images are for inspiration only. Your primary goal is a harmonious, professional design that looks good. If brand colors and reference image colors conflict, derive a cohesive palette—do not force clashing colors. Visual harmony and readability always win.";

const FINAL_DESIGN_COMMANDS = `
FINAL DESIGN COMMANDS (strictly enforce):
- Magazine-quality execution. Sophisticated, premium, and intentional.
- Perfect Typographic Hierarchy: The Headline must be the largest and boldest, immediately drawing the eye. Subheadlines are medium weight.
- Color Harmony: Use a cohesive, limited palette. Avoid mixing clashing tones (e.g. warm orange with cool purple without intentional design). Ensure flawless contrast between text and background for mobile readability.
- Integration: Text and image must not fight for attention. Use intentional negative space, subtle gradients behind text, or creative overlay techniques to blend them smoothly.
- Spacing: Generous, clean margins. Avoid cramped, cluttered, or amateur layouts at all costs.`;

const DESIGNER_TEXT_ARRANGEMENT = `
DESIGNER TEXT ARRANGEMENT (CRITICAL when text is present):
Arrange like a professional editorial designer. Do NOT cram every word into a dense block.
- Create breathing room: generous line spacing between headline, subheadline, and body. Leave 40–60% of the frame as intentional negative space.
- Group related content: Headline + subheadline as one block. Body text as a separate, readable block.
- Limit density: Max 3–4 lines per block. If body text is long, split into logical chunks with visual separation.
- Use composition: Left-align, center, or asymmetric layout—choose one and apply consistently. Avoid walls of text.
- Hierarchy through size: Headline 2–3× subheadline size. Subheadline 1.5× body size. Body text must remain readable at mobile scale.`;

const LAYOUT_DESIGN_GUIDE: Record<string, string> = {
  "magazine-editorial": `
VISUAL LAYOUT & SPATIAL RULES: magazine-editorial.
MAGAZINE EDITORIAL LAYOUT: Edge-to-edge full-bleed background. Leave generous negative space at the absolute top for a massive masthead (Headline). Place the primary subject centrally. Leave smaller pockets of negative space on borders for subheadlines.`,
  "cinematic-poster": `
VISUAL LAYOUT & SPATIAL RULES: cinematic-poster.
CINEMATIC POSTER LAYOUT: Dramatic composition. Center the main subject perfectly. Leave a horizontal band of negative space across the middle for a Title. Leave a small band of empty space at the absolute bottom for body text.`,
  "immersive-visual": `
VISUAL LAYOUT & SPATIAL RULES: immersive-visual.
IMMERSIVE VISUAL LAYOUT: Edge-to-edge subject focus. Do not force large blocks of negative space. The image should be rich and full, as text will be minimally overlaid.`,
  "split-screen": `
VISUAL LAYOUT & SPATIAL RULES: split-screen.
SPLIT-SCREEN LAYOUT: Use a sharp geometric division (vertical or horizontal split). One half must be completely clean negative space strictly for text. The other half contains the visual subject.`,
  "text-top": `
VISUAL LAYOUT & SPATIAL RULES: text-top.
BOTTOM-HEAVY SUBJECT LAYOUT: Anchor the main subject or illustration heavily at the absolute bottom of the frame. Ensure the top 40% of the canvas is clean, uncluttered negative space for top-aligned typography.`,
  "text-bottom": `
VISUAL LAYOUT & SPATIAL RULES: text-bottom.
TOP-HEAVY SUBJECT LAYOUT: Anchor the main subject or illustration at the top or upper-center. Ensure the bottom 40% of the canvas is clean, uncluttered negative space for bottom-aligned typography.`,
  "text-heavy-infographic": `
VISUAL LAYOUT & SPATIAL RULES: text-heavy-infographic.
INFOGRAPHIC GRID LAYOUT: Highly structured. Do not generate a massive hero subject. Use a clean background with small, supportive graphical motifs. Maximize whitespace (80% empty) to accommodate dense, multi-point typography.`,
  "quote-card": `
VISUAL LAYOUT & SPATIAL RULES: quote-card.
STATEMENT CARD LAYOUT: Extreme minimalism. The text is the hero. Generate a beautifully textured, soft, or abstract background with ZERO distracting subjects. Ensure 90% negative space for massive, centered typography.`,
  editorial: `
VISUAL LAYOUT & SPATIAL RULES: magazine-editorial.
MAGAZINE EDITORIAL LAYOUT: Edge-to-edge full-bleed background. Leave generous negative space at the absolute top for a massive masthead (Headline). Place the primary subject centrally.`,
  "text-heavy": `
VISUAL LAYOUT & SPATIAL RULES: text-heavy-infographic.
INFOGRAPHIC GRID LAYOUT: Highly structured. Use a clean background with small, supportive graphical motifs. Maximize whitespace (80% empty) to accommodate dense typography.`,
  "tweet-card": `
VISUAL LAYOUT & SPATIAL RULES: quote-card.
STATEMENT CARD LAYOUT: Extreme minimalism. The text is the hero. Generate a beautifully textured, soft, or abstract background with ZERO distracting subjects.`,
  "immersive-photo": `
VISUAL LAYOUT & SPATIAL RULES: immersive-visual.
IMMERSIVE VISUAL LAYOUT: Edge-to-edge subject focus. Do not force large blocks of negative space. The image should be rich and full, as text will be minimally overlaid.`,
  unspecified: `
VISUAL LAYOUT: No fixed template. Compose a balanced, premium Instagram graphic that fits the brand and topic. Let composition follow the subject and message naturally.`,
  "text-image-balanced": `
VISUAL LAYOUT (integrated text–image): Integrate text and imagery—text weaves through the scene, wraps subjects, or sits in designed pockets within the image (not a separate empty text band). Natural editorial flow, clear hierarchy.`,
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
  carouselPageCount?: number;
  logoUrl?: string | null;
  logoPlacement?: string | null;
  brandType?: string;
  otherBrandType?: string;
  contentFramework?: string;
  postAim?: string;
  /** Post language — drives on-image text language (e.g. bilingual). */
  language?: string;
}): string {
  const vs = options.brandbook?.visual_style as BrandbookVisualStyle;
  const pageIndex = options.pageIndex ?? 1;

  const imageGenPrompt = vs?.imageGenerationPrompt?.trim();
  const colors = vs?.primaryColor
    ? [vs.primaryColor, vs.secondaryColor1, vs.secondaryColor2].filter(Boolean).join(", ")
    : Array.isArray(vs?.colors)
      ? vs.colors.filter((c) => c && String(c).trim()).slice(0, 5).join(", ")
      : "";
  const imageStyle = vs?.imageStyle || vs?.image_style || "professional";
  const colorArray = Array.isArray(vs?.colors) ? vs.colors.filter((c) => c && String(c).trim()) : [];
  const colorLabels = ["Primary background", "Secondary background", "Primary text", "Secondary text", "Backup"];
  const colorUsageInstructions = (vs as { colorDescriptionDetailed?: string })?.colorDescriptionDetailed?.trim() || "";
  const colorDescriptionFromPalette =
    colorArray.length > 0
      ? colorArray
          .slice(0, 5)
          .map((c, i) => (c ? `${colorLabels[i] ?? `Color ${i + 1}`}: ${c}` : ""))
          .filter(Boolean)
          .join(". ")
      : "";
  const colorDescriptionDetailed = colorUsageInstructions
    ? (colors ? `Colors (use these): ${colors}. How to apply: ${colorUsageInstructions}` : `Color usage: ${colorUsageInstructions}`)
    : colorDescriptionFromPalette || (colors ? `Colors (use these): ${colors}` : "");
  const lineStyle = (vs as { lineStyle?: string })?.lineStyle || "";
  const typographySpec = vs?.typographySpec || "";

  const brandContextParts: string[] = [];
  const totalPages = options.carouselPageCount ?? 1;
  if (totalPages > 1) {
    const pageLabel = pageIndex === 1
      ? `This is page 1 (cover) of ${totalPages} in an Instagram carousel.`
      : `This is page ${pageIndex} of ${totalPages} in an Instagram carousel. Maintain visual consistency with previous pages. Use a layout that looks like a typical Instagram carousel inner slide.`;
    brandContextParts.push(`CAROUSEL CONTEXT: ${pageLabel}`);
  }
  if (imageGenPrompt) {
    brandContextParts.push(`CORE VISUAL IDENTITY: Brand image generation prompt (use as primary style): ${imageGenPrompt}`);
  } else {
    brandContextParts.push(`CORE VISUAL IDENTITY: Use brand visual style: ${imageStyle}`);
    if (colorDescriptionDetailed) brandContextParts.push(`Color palette & lighting: ${colorDescriptionDetailed}`);
    if (lineStyle) brandContextParts.push(`Line/stroke characteristics: ${lineStyle}`);
    if (typographySpec) brandContextParts.push(`Typography aesthetic: ${typographySpec}`);
    if (!colorDescriptionDetailed && colors) brandContextParts.push(`Colors (use these): ${colors}`);
  }
  const logoPlacement = options.logoPlacement;
  const showLogo = options.logoUrl && logoPlacement && logoPlacement !== "none";
  if (showLogo) {
    const placementMap: Record<string, string> = {
      "top-left": "top-left corner",
      "top-center": "top center",
      "top-right": "top-right corner",
      "bottom-left": "bottom-left corner",
      "bottom-center": "bottom center",
      "bottom-right": "bottom-right corner",
    };
    const placement = placementMap[logoPlacement] ?? "top-right corner";
    brandContextParts.push(`CRITICAL - LOGO: You MUST include the user's uploaded logo (provided as reference image) in the ${placement} of the composition. The logo is the user's actual branding - use it exactly as shown. Sample posts and reference images are for style/color reference ONLY - do NOT copy logos or branding from them. Always use the user's uploaded logo.`);
  }
  const brandContext = brandContextParts.length > 0
    ? `CORE VISUAL IDENTITY (MANDATORY):\n${brandContextParts.join("\n")}`
    : "";

  const parts: string[] = [BASE_PROMPT, DESIGN_PRIORITY];

  if (options.postAim?.trim()) {
    parts.push(`POST AIM & CONTEXT: This post aims to: ${options.postAim.trim()}. The visual should support this intent.`);
  }

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

  if (options.visualAdvice?.trim()) {
    parts.push(`SCENE & SUBJECT ACTION (CRITICAL): ${options.visualAdvice.trim()}\n*Instruction: Merge this specific scene description seamlessly into the Core Visual Identity defined above. Do not alter the brand's art style to fit the scene; force the scene to match the brand's aesthetic medium and colors exactly.*`);
  }

  const lang = (options.language || "English").trim();
  if (lang) {
    parts.push(languageInstructionForImage(lang));
  }

  const layoutKey = options.postStyle?.trim();
  if (layoutKey) {
    const layoutGuide =
      LAYOUT_DESIGN_GUIDE[layoutKey] || LAYOUT_DESIGN_GUIDE["magazine-editorial"];
    parts.push(layoutGuide);
  }

  let basePrompt = parts.join("\n\n");
  if (!basePrompt.trim()) {
    basePrompt = `Professional Instagram post. Style: ${imageStyle}.${colors ? ` Use these colors: ${colors}.` : ""} High-quality, scroll-stopping visual.`;
  }

  const rawText = (options.imageTextOnImage ?? "").trim();
  const textOnImage = prepareOnImageBriefForModel(rawText);
  if (textOnImage) {
    parts.push(DESIGNER_TEXT_ARRANGEMENT);
    basePrompt = parts.join("\n\n");
    const escaped = textOnImage.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const hasPlacementHints = /placement|upper|lower|left|right|corner|third|center|above|below|zone|align/i.test(
      rawText
    );
    const placementNote = hasPlacementHints
      ? " If the brief specifies positions or zones, honour them when composing type and imagery."
      : "";
    basePrompt += `\n\nON-IMAGE CONTENT BRIEF (CRITICAL): The block below may include exact wording to render, role-separated lines (headline vs subhead vs body), and/or spatial notes.${placementNote} Do not paint meta-labels or role prefixes as visible text unless they are explicitly part of the quoted copy. Preserve line breaks.
DEFAULT TYPOGRAPHY (when roles are not explicit): first line = main headline (largest); then subhead; then body—unless spatial notes override.
Brief:\n"${escaped}"`;
  }

  return basePrompt + FINAL_DESIGN_COMMANDS;
}
