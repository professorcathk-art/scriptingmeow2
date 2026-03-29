/**
 * Loads prompt templates from prompts/*.md and replaces placeholders.
 * Edit the markdown files to change AI behavior without code changes.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { MAX_ON_IMAGE_INSTRUCTION_CHARS } from "@/lib/constants";

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
    "lineStyle": "string",
    "vibe": ["string"],
    "typographySpec": "string",
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

const FALLBACK_SINGLE = `## BRIEF (primary input)
**Topic/Idea:** {{idea}}

## CONTEXT
- Brand: {{personality}}. Tone: {{tone}}. Style: {{style}}. Colors: {{colors}}.
- Brand type: {{brandTypeLabel}}. Content goal: {{contentFrameworkDesc}}
{{visualLayoutContext}}
- Quality: {{qualityGuide}}
- Specs: Lang {{language}}. Format {{format}}.

## TASK
Create 2 DISTINCT Instagram post draft variations using the BRIEF and CONTEXT above.

## Output Format
Return valid JSON only. Include postAim first (required): who this is for, what the post should achieve for the image model, and how it supports the brand—1–3 sentences, max 500 characters.
{
  "postAim": "Required: brand context + intent for this post",
  "variation1": {"imageTextOnImage":"","visualAdvice":"","igCaption":""},
  "variation2": {"imageTextOnImage":"","visualAdvice":"","igCaption":""}
}

### Field rules:
1. imageTextOnImage: {{textGuide}}
2. visualAdvice: HIGHLY DETAILED (4–7 sentences, 80–150 words). If a [Source Image URL: https...] is provided, you MUST include: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later." Scene (subject, pose, environment), composition (framing, negative space), lighting (direction, quality), text placement, color usage from brand, mood. Aspect {{aspectNote}}. Do NOT be brief.
3. igCaption: Standalone Instagram caption up to 2000 characters—hook, full explanation of the idea (so the post is understandable without the image), value, and a save/share CTA. Max 3 hashtags.`;

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
    textGuide:
      vars.textGuide ||
      `On-image brief per slide: plain text only. Up to ${MAX_ON_IMAGE_INSTRUCTION_CHARS} characters—exact lines to render plus optional placement notes (e.g. Headline: / Subhead: / Body: or zone-based instructions).`,
    idea: vars.idea,
    format: vars.format,
    aspectNote: vars.aspectNote,
    language: vars.language,
    onImageMaxChars: String(MAX_ON_IMAGE_INSTRUCTION_CHARS),
  });
}

const FALLBACK_CAROUSEL = `## BRIEF (primary input)
{{idea}}

## CONTEXT
- Brand: {{personality}}. Tone: {{tone}}. Style: {{style}}. Colors: {{colors}}.
- Content: {{contentFrameworkDesc}}. Layout: {{layoutGuide}}
{{extraContext}}
- Format: {{format}}. Aspect: {{aspectNote}}.

## TASK
Create a {{pageCount}}-page Instagram carousel using the BRIEF and CONTEXT above.

## Output Format
If a [Source Image URL: https...] is provided, visualAdvice MUST include: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later."
Return valid JSON only. Include postAim (required): brand context + intent, max 500 characters. imageTextOnImage: {{textGuide}}
{
  "postAim": "Required: brand context + intent for this carousel",
  "pages": [
    { "pageIndex": 1, "imageTextOnImage": "Plain text; use \\\\n for line breaks. Headline: / Subhead: / Body: or placement notes as needed.", "visualAdvice": "HIGHLY DETAILED (4–6 sentences): scene, composition, lighting, text placement, color usage, mood" },
    ...
  ],
  "igCaption": "Full caption up to 2000 characters: hook, full story, CTA. Max 3 hashtags."
}`;

/** Lightweight draft prompts - no brandbook needed. Used for fast draft generation. */
const DRAFT_SINGLE_LIGHT = `## BRIEF (primary input)
Content idea: {{idea}}

## CONTEXT
- Language: {{language}}. Format: {{format}}. Layout: {{layout}}.
- Content goal: {{contentFrameworkDesc}}

## TASK
Create 2 DISTINCT Instagram post draft variations. Treat **imageTextOnImage** as an art-direction brief: plain text only—exact wording to appear on the graphic, optional role labels (Headline / Subhead / Body), and/or short placement notes (zones, alignment). Stay within {{onImageMaxChars}} characters per variation; compress without losing the message.

## Enrichment (CRITICAL)
- If the idea includes "Source: [URL]", the content is from RSS/news. Use the URL and full content for context. Do NOT just repeat the title.
- ENRICH the idea: add scroll-stopping hooks, curiosity gaps, emotional angles, or counter-intuitive twists. Expand key points.
- Create value-driven, shareable content—not a dry summary. Hook the reader in the first line.

## Source Image Overlay
- If a [Source Image URL: https...] is provided in the idea, you MUST structure your visualAdvice to include an explicit layout command: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later."

## Output
Return valid JSON only. **postAim must be the first substantive field** (required): 1–3 sentences, max 500 characters—audience, intent, and how the visual should support the post.
{
  "postAim": "Required: audience + intent + role of the visual",
  "variation1": {"imageTextOnImage":"","visualAdvice":"","igCaption":""},
  "variation2": {"imageTextOnImage":"","visualAdvice":"","igCaption":""}
}

Completion rules:
- postAim: Never omit or leave empty.
- imageTextOnImage: Match the layout context; prioritise readable hierarchy and faithful placement notes within {{onImageMaxChars}} characters.
- visualAdvice: HIGHLY DETAILED designer layout (4–7 sentences, 80–150 words): scene, composition, lighting, text blocks, palette, mood. Aspect {{aspectNote}}.
- igCaption: Full Instagram caption up to 2000 characters—opening hook, complete articulation of the idea (understandable without the image), proof or steps as needed, and a save/share CTA. Max 3 hashtags. Write one cohesive narrative, not a teaser paragraph.`;

const DRAFT_CAROUSEL_LIGHT = `## BRIEF (primary input)
{{idea}}

## CONTEXT
- Language: {{language}}. Format: {{format}}. Aspect: {{aspectNote}}.
- Content goal: {{contentFrameworkDesc}}. Visual layout: {{layoutGuide}}

## TASK
Create a {{pageCount}}-page Instagram carousel. Per slide, **imageTextOnImage** is an on-image brief (copy + optional placement), up to {{onImageMaxChars}} characters. **visualAdvice** must be a rich designer layout every time.
{{#isTextHeavy}}TEXT-HEAVY MODE: Each slide needs substantive on-image copy—multiple lines, clear hierarchy, teaching or persuasive depth. Do not under-write.{{/isTextHeavy}}

## Enrichment (CRITICAL)
- If the idea includes "Source: [URL]", the content is from RSS/news. Use the URL and full content for context. Do NOT just repeat the title.
- ENRICH the idea: add scroll-stopping hooks, curiosity gaps, emotional angles. Expand key points. Create value-driven, shareable content.

## Source Image Overlay
- If a [Source Image URL: https...] is provided in the idea, you MUST structure visualAdvice on every page (or at least the cover) to include an explicit layout command: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later."

## Output
Return valid JSON only. **postAim is required** (1–3 sentences, max 500 characters): brand- and audience-grounded intent for the whole carousel.
{
  "postAim": "Required: context + intent for the carousel",
  "pages": [
    { "pageIndex": 1, "imageTextOnImage": "Headline: ...\\nSubhead: ...\\nBody: ... (or placement notes as needed)", "visualAdvice": "Designer layout: background + text blocks + spacing + cohesive colors (4–6 sentences)" },
    ...
  ],
  "igCaption": "Full caption up to 2000 characters: hook, complete narrative across slides, CTA. Max 3 hashtags."
}

Field discipline: each slide's imageTextOnImage stays within {{onImageMaxChars}} characters. visualAdvice per page: HIGHLY DETAILED (4–6 sentences, 80–120 words). igCaption: one full story that reflects the entire carousel—not a short teaser.`;

export function getSingleImageDraftPromptLight(vars: {
  idea: string;
  language: string;
  format: string;
  layout: string;
  contentFrameworkDesc: string;
  aspectNote: string;
}): string {
  return replaceAll(DRAFT_SINGLE_LIGHT, {
    ...vars,
    onImageMaxChars: String(MAX_ON_IMAGE_INSTRUCTION_CHARS),
  });
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
    onImageMaxChars: String(MAX_ON_IMAGE_INSTRUCTION_CHARS),
  });
}
