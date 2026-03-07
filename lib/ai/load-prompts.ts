/**
 * Loads prompt templates from prompts/*.md and replaces placeholders.
 * Edit the markdown files to change AI behavior without code changes.
 */

import { readFileSync } from "fs";
import { join } from "path";

function loadMarkdown(filename: string): string {
  try {
    const path = join(process.cwd(), "prompts", filename);
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function extractSection(content: string, header: string, toEnd = false): string {
  const escaped = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = toEnd
    ? new RegExp(`##\\s+${escaped}[^\\n]*\\n([\\s\\S]*)`, "i")
    : new RegExp(`##\\s+${escaped}[^\\n]*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function replaceAll(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), val);
  }
  return out;
}

const BRANDBOOK_JSON_SCHEMA = `

{
  "brandPersonality": "string",
  "toneOfVoice": "string",
  "visualStyle": {
    "colors": ["#hex", "#hex", ...],
    "primaryColor": "#hex",
    "secondaryColor1": "#hex",
    "secondaryColor2": "#hex",
    "backgroundColor": "string",
    "imageStyle": "string",
    "carouselInnerStyle": "string",
    "colorDescriptionDetailed": "string",
    "visualAura": "string",
    "lineStyle": "string",
    "layoutTendencies": "string",
    "layoutStyle": "string",
    "vibe": ["string"],
    "typographySpec": "string",
    "layoutStyleDetail": "string",
    "imageGenerationPrompt": "string"
  },
  "dosAndDonts": {
    "dos": ["string"],
    "donts": ["string"]
  }
}`;

export function getBrandbookPrompt(vars: {
  brandName: string;
  brandTypeContext: string;
  audiences: string;
  painPoints: string;
  outcomes: string;
  valueProp: string;
  refImagesSection: string;
}): string {
  const raw = loadMarkdown("brandbook.md");
  const promptSection = raw ? extractSection(raw, "Prompt", true) : "";
  const template = promptSection || FALLBACK_BRANDBOOK;
  const filled = replaceAll(template, vars);
  return filled + BRANDBOOK_JSON_SCHEMA;
}

const FALLBACK_BRANDBOOK = `You are a top-tier Instagram Visual Director and Brand Psychologist. Create a DETAILED, INSTITUTIONAL-GRADE Brand Book.

## Brand Information
- Name: {{brandName}}
- Brand Type: {{brandTypeContext}}
- Target Audiences: {{audiences}}
- Audience Pain Points: {{painPoints}}
- Desired Outcomes: {{outcomes}}
- Value Proposition: {{valueProp}}

{{refImagesSection}}

## Output Format
See JSON schema at end.`;

export function getSingleImageDraftPrompt(vars: {
  personality: string;
  tone: string;
  style: string;
  colors: string;
  brandTypeLabel: string;
  contentFrameworkDesc: string;
  visualLayoutContext: string;
  qualityGuide: string;
  idea: string;
  language: string;
  format: string;
  textGuide: string;
  aspectNote: string;
}): string {
  const raw = loadMarkdown("draft-post.md");
  const section = raw ? extractSection(raw, "Single-image prompt") : "";
  const template = section || FALLBACK_SINGLE;
  return replaceAll(template, vars);
}

const FALLBACK_SINGLE = `You are a Master Instagram Content Strategist. Create 2 DISTINCT draft variations.

## Brand & Context
- Brand: {{personality}}. Tone: {{tone}}. Style: {{style}}. Colors: {{colors}}.
- Brand type: {{brandTypeLabel}}.
- Content goal: {{contentFrameworkDesc}}
{{visualLayoutContext}}

## Quality Focus
{{qualityGuide}}

## Brief
{{idea}}
Lang: {{language}}. Format: {{format}}.

## Output Format
Return valid JSON only:
{
  "variation1": {"imageTextOnImage":"","visualAdvice":"","igCaption":""},
  "variation2": {"imageTextOnImage":"","visualAdvice":"","igCaption":""}
}

### Field rules:
1. imageTextOnImage: {{textGuide}}
2. visualAdvice: HIGHLY DETAILED (4–7 sentences, 80–150 words). If a [Source Image URL: https...] is provided, you MUST include: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later." Scene (subject, pose, environment), composition (framing, negative space), lighting (direction, quality), text placement, color usage from brand, mood. Aspect {{aspectNote}}. Do NOT be brief.
3. igCaption: Max 400 chars, max 3 hashtags.`;

export function getCarouselDraftPrompt(vars: {
  pageCount: number;
  language: string;
  personality: string;
  tone: string;
  style: string;
  colors: string;
  contentFrameworkDesc: string;
  layoutGuide: string;
  layoutStyleDetail?: string;
  dosDonts?: string;
  textGuide?: string;
  idea: string;
  format: string;
  aspectNote: string;
  isTextHeavy: boolean;
}): string {
  const raw = loadMarkdown("draft-post.md");
  const section = raw ? extractSection(raw, "Carousel prompt") : "";
  let template = section || FALLBACK_CAROUSEL;
  template = template.replace(/\{\{pageCount\}\}/g, String(vars.pageCount));
  template = template.replace(/\{\{isTextHeavy\}\}/g, String(vars.isTextHeavy));
  const extraParts: string[] = [];
  if (vars.layoutStyleDetail) extraParts.push(`Layout: ${vars.layoutStyleDetail}`);
  if (vars.dosDonts) extraParts.push(`Brand rules: ${vars.dosDonts}`);
  const extraContext = extraParts.length > 0 ? extraParts.join(". ") : "";

  return replaceAll(template, {
    personality: vars.personality,
    tone: vars.tone,
    style: vars.style,
    colors: vars.colors,
    contentFrameworkDesc: vars.contentFrameworkDesc,
    layoutGuide: vars.layoutGuide,
    extraContext,
    textGuide: vars.textGuide || "2–5 lines per slide, use 主標題：, 副標題：, 內文：. Plain text only.",
    idea: vars.idea,
    format: vars.format,
    aspectNote: vars.aspectNote,
    language: vars.language,
  });
}

const FALLBACK_CAROUSEL = `You are an expert Instagram Art Director. Create a {{pageCount}}-page carousel.

## Brand & Context
- Brand: {{personality}}. Tone: {{tone}}. Style: {{style}}. Colors: {{colors}}.
- Content framework: {{contentFrameworkDesc}}
- Visual layout: {{layoutGuide}}
{{extraContext}}

## User Brief
{{idea}}

Format: {{format}}. Aspect ratio: {{aspectNote}}.

## Output Format
If a [Source Image URL: https...] is provided, visualAdvice MUST include: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later."
Return valid JSON only. imageTextOnImage: {{textGuide}}
{
  "pages": [
    { "pageIndex": 1, "imageTextOnImage": "Text (use \\n). Include 主標題：, 副標題：, 內文：.", "visualAdvice": "HIGHLY DETAILED (4–6 sentences): scene, composition, lighting, text placement, color usage, mood" },
    ...
  ],
  "igCaption": "Full caption (max 400 chars, max 3 hashtags)."
}`;

/** Lightweight draft prompts - no brandbook needed. Used for fast draft generation. */
const DRAFT_SINGLE_LIGHT = `Create 2 DISTINCT Instagram post draft variations. Be DETAILED—imageTextOnImage and visualAdvice must be substantive, not minimal.

## Brief
Content idea: {{idea}}
Language: {{language}}. Format: {{format}}. Layout: {{layout}}.
Content goal: {{contentFrameworkDesc}}

## Enrichment (CRITICAL)
- If the idea includes "Source: [URL]", the content is from RSS/news. Use the URL and full content for context. Do NOT just repeat the title.
- ENRICH the idea: add scroll-stopping hooks, curiosity gaps, emotional angles, or counter-intuitive twists. Expand key points.
- Create value-driven, shareable content—not a dry summary. Hook the reader in the first line.

## Source Image Overlay
- If a [Source Image URL: https...] is provided in the idea, you MUST structure your visualAdvice to include an explicit layout command: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later."

## Output
Return valid JSON only. Include postAim: brief brand context + post aim (1-3 sentences, max 500 chars). E.g. "Brand: [brief background]. This post aims to educate on X, build trust by Y."
{
  "postAim": "Brief brand context and post aim (max 500 chars)",
  "variation1": {"imageTextOnImage":"","visualAdvice":"","igCaption":""},
  "variation2": {"imageTextOnImage":"","visualAdvice":"","igCaption":""}
}

Rules: postAim = overall aim of post for image gen context. imageTextOnImage = text on image—2–4 lines, substantive (plain text). Use hierarchy labels 主標題：, 副標題：, 內文： so the image generator applies correct typography. visualAdvice = HIGHLY DETAILED DESIGNER LAYOUT (4–7 sentences, 80–150 words): scene (subject, pose, environment), composition (framing, negative space), lighting (direction, quality), text arrangement (blocks, spacing, positions), cohesive color palette, mood. Aspect {{aspectNote}}. Do NOT be brief—the image generator needs rich detail. igCaption = COMPREHENSIVE caption up to 1000 chars: hook + full storytelling (key info from post) + CTA to save/share. Max 3 hashtags. The caption should stand alone and make readers want to save and share.`;

const DRAFT_CAROUSEL_LIGHT = `Create a {{pageCount}}-page Instagram carousel. Be DETAILED—imageTextOnImage (up to 200 chars/slide) and visualAdvice (2–4 sentences per page) must be substantive.

## Brief
{{idea}}
Language: {{language}}. Format: {{format}}. Aspect: {{aspectNote}}.
Content goal: {{contentFrameworkDesc}}
Visual layout: {{layoutGuide}}
{{#isTextHeavy}}TEXT-HEAVY MODE: Headlines and imageTextOnImage must be SUBSTANTIVE—2–5 lines per slide, up to 200 chars. Main headline (主標題) + subheadline + body. Do NOT be brief or minimal. Educational/value content: teach, inform, actionable advice.{{/isTextHeavy}}

## Enrichment (CRITICAL)
- If the idea includes "Source: [URL]", the content is from RSS/news. Use the URL and full content for context. Do NOT just repeat the title.
- ENRICH the idea: add scroll-stopping hooks, curiosity gaps, emotional angles. Expand key points. Create value-driven, shareable content.

## Source Image Overlay
- If a [Source Image URL: https...] is provided in the idea, you MUST structure visualAdvice on every page (or at least the cover) to include an explicit layout command: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later."

## Output
Return valid JSON only. Include postAim: brief brand context + post aim (1-3 sentences, max 500 chars).
{
  "postAim": "Brief brand context and post aim (max 500 chars)",
  "pages": [
    { "pageIndex": 1, "imageTextOnImage": "主標題：5 Mistakes That Kill Your Growth\\n副標題：Subheadline\\n內文：Body text (use \\n for breaks)", "visualAdvice": "Designer layout: background + text blocks + spacing + cohesive colors (2–4 sentences)" },
    ...
  ],
  "igCaption": "COMPREHENSIVE caption up to 1000 chars: hook + full storytelling (key info from post) + CTA to save/share. Max 3 hashtags."
}

postAim = overall aim for image gen. imageTextOnImage = 2–5 lines, up to 200 chars per slide. Use hierarchy labels 主標題：, 副標題：, 內文： so the image generator applies correct typography. visualAdvice = HIGHLY DETAILED DESIGNER LAYOUT per page (4–6 sentences, 80–120 words): background (exact treatment—gradient, solid, texture), text arrangement (headline block position, body block, line spacing, 40–60% negative space), cohesive color palette (which colors for what), optional motif (position, size). Do NOT be brief—each page needs rich detail for the image generator. igCaption = COMPREHENSIVE caption up to 1000 chars: hook + full storytelling (key info from post) + CTA to save/share. Max 3 hashtags. The caption should stand alone and make readers want to save and share.`;

export function getSingleImageDraftPromptLight(vars: {
  idea: string;
  language: string;
  format: string;
  layout: string;
  contentFrameworkDesc: string;
  aspectNote: string;
}): string {
  return replaceAll(DRAFT_SINGLE_LIGHT, vars);
}

export function getCarouselDraftPromptLight(vars: {
  pageCount: number;
  idea: string;
  language: string;
  format: string;
  aspectNote: string;
  contentFrameworkDesc: string;
  layoutGuide: string;
  isTextHeavy: boolean;
}): string {
  let t = DRAFT_CAROUSEL_LIGHT.replace(/\{\{pageCount\}\}/g, String(vars.pageCount));
  t = t.replace(/\{\{#isTextHeavy\}\}([\s\S]*?)\{\{\/isTextHeavy\}\}/g, vars.isTextHeavy ? "$1" : "");
  return replaceAll(t, {
    idea: vars.idea,
    language: vars.language,
    format: vars.format,
    aspectNote: vars.aspectNote,
    contentFrameworkDesc: vars.contentFrameworkDesc,
    layoutGuide: vars.layoutGuide,
  });
}
