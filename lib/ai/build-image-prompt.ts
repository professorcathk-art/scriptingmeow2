/**
 * Builds the final image generation prompt: overall design brief + styling + layout rules.
 * When draft "styling" is present, full brandbook palette/typography is not repeated—
 * the draft styling carries brand look; we still inject logo rules and minimal safety hints.
 */

import { languageInstructionForImage } from "@/lib/language-image-prompt";
import { mergeLegacyDraftToOverall } from "@/lib/draft-data";

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
 * Prepare overall design brief: strip markdown; strip legacy typography role labels
 * so they are not painted as visible words; preserve placement / scene lines.
 */
function prepareOverallDesignForModel(rawText: string): string {
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
  "DESIGN PRIORITY: Reference images are for inspiration. Your primary goal is a harmonious, professional design. If reference colors and the brief conflict, follow the creative brief and styling section. Visual harmony and readability always win.";

const FINAL_DESIGN_COMMANDS = `
FINAL DESIGN COMMANDS (strictly enforce):
- Magazine-quality execution. Sophisticated, premium, and intentional.
- Perfect Typographic Hierarchy: The main headline must be the largest and boldest when text is present. Supporting lines are medium weight.
- Color Harmony: Use a cohesive, limited palette. Ensure flawless contrast between text and background for mobile readability.
- Integration: Text and image must not fight for attention. Use intentional negative space, subtle gradients behind text, or creative overlay techniques to blend them smoothly.
- Spacing: Generous, clean margins. Avoid cramped, cluttered, or amateur layouts at all costs.`;

const DESIGNER_TEXT_ARRANGEMENT = `
DESIGNER TEXT ARRANGEMENT (CRITICAL when the brief includes on-image text):
Arrange like a professional editorial designer. Do NOT cram every word into a dense block.
- Create breathing room: generous line spacing. Leave intentional negative space.
- Group related content. Limit density: max 3–4 lines per block unless the brief specifies otherwise.
- Hierarchy through size: hero line largest; supporting copy smaller; fine print smallest.`;

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
  lineStyle?: string;
  layoutTendencies?: string;
  typographySpec?: string;
  vibe?: string[];
} | null;

export type BuildImagePromptInput = {
  brandbook: {
    visual_style?: BrandbookVisualStyle;
    brand_personality?: string;
    tone_of_voice?: string;
  };
  /** Full creative brief: scene, people/objects, composition, all text to appear — unified. */
  overallDesign?: string;
  /** Brand-aligned look from draft; when set, reduces duplicate brandbook palette/typography blocks. */
  styling?: string;
  /** @deprecated use overallDesign + styling */
  visualAdvice?: string;
  /** @deprecated use overallDesign */
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
  language?: string;
};

function resolveOverallDesign(o: BuildImagePromptInput): string {
  const direct = (o.overallDesign ?? "").trim();
  if (direct) return direct;
  const legacyText = (o.imageTextOnImage ?? "").trim();
  const legacyScene = (o.visualAdvice ?? "").trim();
  if (legacyText || legacyScene) return mergeLegacyDraftToOverall(legacyScene, legacyText);
  return "";
}

function resolveStyling(o: BuildImagePromptInput): string {
  return (o.styling ?? "").trim();
}

/**
 * When draft includes a styling block, avoid repeating full brandbook colors/typography.
 */
function buildBrandContextBlock(options: {
  vs: BrandbookVisualStyle;
  pageIndex: number;
  totalPages: number;
  logoPlacement?: string | null;
  logoUrl?: string | null;
  condensed: boolean;
}): string {
  const { vs, pageIndex, totalPages, condensed } = options;
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
  if (totalPages > 1) {
    const pageLabel =
      pageIndex === 1
        ? `This is page 1 (cover) of ${totalPages} in an Instagram carousel.`
        : `This is page ${pageIndex} of ${totalPages} in an Instagram carousel. Maintain visual consistency with previous pages. Use a layout that looks like a typical Instagram carousel inner slide.`;
    brandContextParts.push(`CAROUSEL CONTEXT: ${pageLabel}`);
  }

  if (condensed) {
    if (imageGenPrompt) {
      brandContextParts.push(`BRAND ANCHOR (short — styling section below is primary): ${imageGenPrompt.slice(0, 400)}${imageGenPrompt.length > 400 ? "…" : ""}`);
    } else {
      brandContextParts.push(`DEFAULT MEDIUM HINT (only if styling is silent): ${imageStyle}`);
      if (colors) brandContextParts.push(`Palette hint (only if styling does not specify colors): ${colors}`);
    }
  } else if (imageGenPrompt) {
    brandContextParts.push(`CORE VISUAL IDENTITY: Brand image generation prompt (use as primary style): ${imageGenPrompt}`);
  } else {
    brandContextParts.push(`CORE VISUAL IDENTITY: Use brand visual style: ${imageStyle}`);
    if (colorDescriptionDetailed) brandContextParts.push(`Color palette & lighting: ${colorDescriptionDetailed}`);
    if (lineStyle) brandContextParts.push(`Line/stroke characteristics: ${lineStyle}`);
    if (typographySpec) brandContextParts.push(`Typography aesthetic: ${typographySpec}`);
    if (!colorDescriptionDetailed && colors) brandContextParts.push(`Colors (use these): ${colors}`);
  }

  const showLogo = options.logoUrl && options.logoPlacement && options.logoPlacement !== "none";
  if (showLogo) {
    const placementMap: Record<string, string> = {
      "top-left": "top-left corner",
      "top-center": "top center",
      "top-right": "top-right corner",
      "bottom-left": "bottom-left corner",
      "bottom-center": "bottom center",
      "bottom-right": "bottom-right corner",
    };
    const placement = placementMap[options.logoPlacement!] ?? "top-right corner";
    brandContextParts.push(
      `CRITICAL - LOGO: You MUST include the user's uploaded logo (provided as reference image) in the ${placement} of the composition. The logo is the user's actual branding - use it exactly as shown. Sample posts and reference images are for style reference ONLY - do NOT copy logos from them.`
    );
  }

  if (brandContextParts.length === 0) return "";
  return `BRAND & CONTEXT (MANDATORY):\n${brandContextParts.join("\n")}`;
}

export function buildImagePrompt(options: BuildImagePromptInput): string {
  const vs = options.brandbook?.visual_style as BrandbookVisualStyle;
  const pageIndex = options.pageIndex ?? 1;
  const totalPages = options.carouselPageCount ?? 1;

  const stylingDraft = resolveStyling(options);
  const condensedBrand = Boolean(stylingDraft);

  const brandContext = buildBrandContextBlock({
    vs: vs ?? {},
    pageIndex,
    totalPages,
    logoPlacement: options.logoPlacement,
    logoUrl: options.logoUrl,
    condensed: condensedBrand,
  });

  const parts: string[] = [BASE_PROMPT, DESIGN_PRIORITY];

  if (options.postAim?.trim()) {
    parts.push(`POST AIM & CONTEXT: This post aims to: ${options.postAim.trim()}. The visual should support this intent.`);
  }

  if (options.brandType || options.contentFramework) {
    const brandTypeNote = options.brandType
      ? `Brand Type: ${options.brandType === "other" && options.otherBrandType ? options.otherBrandType : options.brandType}`
      : "";
    const contentNote =
      options.contentFramework && CONTENT_FRAMEWORK_IMAGE_GUIDE[options.contentFramework]
        ? CONTENT_FRAMEWORK_IMAGE_GUIDE[options.contentFramework]
        : "";
    if (brandTypeNote || contentNote) {
      parts.push(
        `CONTEXT & VIBE: ${[brandTypeNote, contentNote].filter(Boolean).join(". ")} Ensure the overall mood and composition reflect this intent.`
      );
    }
  }

  if (brandContext) {
    parts.push(brandContext);
  }

  if (stylingDraft) {
    parts.push(
      `VISUAL STYLING (PRIMARY — follow this for brand look, palette, mood, medium, light, texture; do not contradict with a generic palette): ${stylingDraft}`
    );
  }

  const overallRaw = resolveOverallDesign(options);
  const overallPrepared = prepareOverallDesignForModel(overallRaw);
  if (overallPrepared) {
    parts.push(
      `FULL DESIGN BRIEF (CRITICAL — scene, people and objects, composition, and all text that must appear): ${overallPrepared.trim()}\n*Execute this brief faithfully. It is the single source of truth for what belongs in the frame.*`
    );
  }

  const lang = (options.language || "English").trim();
  if (lang) {
    parts.push(languageInstructionForImage(lang));
  }

  const layoutKey = options.postStyle?.trim();
  if (layoutKey) {
    const layoutGuide = LAYOUT_DESIGN_GUIDE[layoutKey] || LAYOUT_DESIGN_GUIDE["magazine-editorial"];
    parts.push(layoutGuide);
  }

  let basePrompt = parts.join("\n\n");
  if (!basePrompt.trim()) {
    const fallbackStyle = vs?.imageStyle || vs?.image_style || "professional";
    basePrompt = `Professional Instagram post. Style: ${fallbackStyle}. High-quality, scroll-stopping visual.`;
  }

  if (overallPrepared) {
    basePrompt += `\n\n${DESIGNER_TEXT_ARRANGEMENT}`;
  }

  return basePrompt + FINAL_DESIGN_COMMANDS;
}
