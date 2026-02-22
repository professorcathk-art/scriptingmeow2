/**
 * Builds the full image generation prompt including brandbook details,
 * visual advice, and text-on-image instructions.
 */

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

  if (brandContext) {
    parts.push(`BRAND CONTEXT: ${brandContext}`);
  }

  if (options.visualAdvice?.trim()) {
    parts.push(`VISUAL ADVICE: ${options.visualAdvice.trim()}`);
  }

  if (options.contentIdea?.trim()) {
    parts.push(`Content theme: ${options.contentIdea.trim().slice(0, 150)}`);
  }

  let basePrompt = parts.join("\n\n");
  if (!basePrompt.trim()) {
    basePrompt = `Professional Instagram post. Style: ${imageStyle}. Mood: ${mood}.${colors ? ` Use these colors: ${colors}.` : ""} High-quality, scroll-stopping visual.`;
  }

  const textOnImage = (options.imageTextOnImage ?? "").trim();
  if (textOnImage) {
    basePrompt += `\n\nCRITICAL - TEXT TO RENDER ON IMAGE: The following text MUST appear on the image, clearly visible and legible. Style it appropriately for a ${options.postStyle || "editorial"} layout. Do not paraphrase or shorten.\n\n"${textOnImage.replace(/"/g, '\\"')}"`;
  }

  return basePrompt;
}
