/**
 * Loads prompt templates from prompts/*.md and replaces placeholders.
 * Edit the markdown files to change AI behavior without code changes.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { MAX_ON_IMAGE_INSTRUCTION_CHARS, MAX_STYLING_CHARS } from "@/lib/constants";

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
  overallDesignGuide: string;
  stylingGuide: string;
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

## Idea development (mandatory)
Treat the **Topic/Idea** as a **seed**, not final copy. Enrich it with concrete structure (tips, steps, contrasts, examples, or teaching beats) that go beyond paraphrasing the user’s words. Do not fill the overallDesign or igCaption JSON fields with mostly recycled sentences from the brief. If the layout is text-heavy, show real hierarchy—multiple lines, bullets, or labels—not a single slogan.

## Output Format
Return valid JSON only. Include postAim first (required): who this is for, what the post should achieve for the image model, and how it supports the brand—1–3 sentences, max 500 characters.
{
  "postAim": "Required: brand context + intent for this post",
  "variation1": {"overallDesign":"","styling":"","igCaption":""},
  "variation2": {"overallDesign":"","styling":"","igCaption":""}
}

### Field rules:
1. **overallDesign** (single field for the whole graphic): {{overallDesignGuide}} Plain text only, no markdown. This must describe the **complete** creative intent—setting/background, people and objects, composition, framing, and **every** piece of text that should appear (with placement and emphasis). Do not split “text” from “scene” across two fields; that belongs here together.
2. **styling**: {{stylingGuide}} Express brand-look only—palette, lighting mood, medium (photo/illustration/3D), texture, typography personality. Do **not** repeat scene layout or narrative here; that is in overallDesign. If a [Source Image URL: https...] is provided, include in **overallDesign** the layout command: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later."
3. igCaption: Standalone Instagram caption up to 2000 characters—hook, full explanation of the idea (so the post is understandable without the image), value, and a save/share CTA. Max 3 hashtags.`;

export function getCarouselDraftPrompt(vars: {
  pageCount: number;
  language: string;
  personality: string;
  tone: string;
  style: string;
  colors: string;
  contentFrameworkDesc: string;
  layoutSpatialLine: string;
  dosDonts?: string;
  overallDesignGuide: string;
  stylingGuide: string;
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
  template = template.replace(/\{\{#isTextHeavy\}\}([\s\S]*?)\{\{\/isTextHeavy\}\}/g, vars.isTextHeavy ? "$1" : "");
  const extraParts: string[] = [];
  if (vars.dosDonts) extraParts.push(`Brand rules: ${vars.dosDonts}`);
  const extraContext =
    extraParts.length > 0 ? `\n${extraParts.map((p) => `- ${p}`).join("\n")}` : "";

  return replaceAll(template, {
    personality: vars.personality,
    tone: vars.tone,
    style: vars.style,
    colors: vars.colors,
    contentFrameworkDesc: vars.contentFrameworkDesc,
    layoutSpatialLine: vars.layoutSpatialLine,
    extraContext,
    overallDesignGuide: vars.overallDesignGuide,
    stylingGuide: vars.stylingGuide,
    idea: vars.idea,
    format: vars.format,
    aspectNote: vars.aspectNote,
    language: vars.language,
    overallMaxChars: String(MAX_ON_IMAGE_INSTRUCTION_CHARS),
    stylingMaxChars: String(MAX_STYLING_CHARS),
  });
}

const FALLBACK_CAROUSEL = `## BRIEF (primary input)
{{idea}}

## CONTEXT
- Brand: {{personality}}. Tone: {{tone}}. Style: {{style}}. Colors: {{colors}}.
- Content: {{contentFrameworkDesc}}. Spatial layout: {{layoutSpatialLine}}
{{extraContext}}
- Format: {{format}}. Aspect: {{aspectNote}}.

## TASK
Create a {{pageCount}}-page Instagram carousel using the BRIEF and CONTEXT above.

## Output Format
If a [Source Image URL: https...] is provided, put that layout command in **overallDesign** (not styling alone): "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later."
Return valid JSON only. Include postAim (required): brand context + intent, max 500 characters.
Per page: **overallDesign** = {{overallDesignGuide}} (storage ceiling ~{{overallMaxChars}} chars—dense slides should approach this). **styling** = {{stylingGuide}} (storage ceiling ~{{stylingMaxChars}} chars).
{
  "postAim": "Required: brand context + intent for this carousel",
  "pages": [
    { "pageIndex": 1, "header": "", "overallDesign": "Full slide brief: scene + objects + text in the user's language", "styling": "Brand look: palette, light, mood, medium" },
    ...
  ],
  "igCaption": "Full caption up to 2000 characters: hook, full story, CTA. Max 3 hashtags."
}`;

/** Lightweight draft prompts - no brandbook needed. Used for fast draft generation. */
const DRAFT_SINGLE_LIGHT = `## BRIEF (primary input)
Content idea: {{idea}}

## CONTEXT
- Language: {{language}}. Format: {{format}}. Spatial layout: {{layoutSpatialLine}}
- Content goal: {{contentFrameworkDesc}}

## TASK
Create 2 DISTINCT Instagram post draft variations.

**overallDesign** = one unified field for the **entire** graphic: describe the scene (setting, people, objects), composition, and **all** text that must appear on the image (placement + emphasis + exact words). Plain text, no markdown. Follow: {{overallDesignGuide}} Storage limit ~{{overallMaxChars}} characters per variation (this is a ceiling—text-heavy layouts should use most of it; do not aim for a short answer).

**styling** = brand-aligned **look** only: palette, lighting mood, medium/texture, typography personality—aligned with how a brandbook would describe execution. Follow: {{stylingGuide}} Storage limit ~{{stylingMaxChars}} characters. Do not put scene layout or story beats here; those belong in overallDesign.

## Enrichment (CRITICAL)
- The idea field is a **seed brief** only. You must **develop** it: add layers, specifics, and structure the user did not type.
- If the idea includes "Source: [URL]", the content is from RSS/news. Use the URL and full content for context. Do NOT just repeat the title.
- ENRICH the idea: add scroll-stopping hooks, curiosity gaps, emotional angles, or counter-intuitive twists. Expand key points.
- Create value-driven, shareable content—not a dry summary. Hook the reader in the first line.
- Do **not** treat the user’s paragraph as pasted into the caption; synthesize and expand.

## Source Image Overlay
- If a [Source Image URL: https...] is provided in the idea, put the layout command in **overallDesign**: "Leave a clean, distinct rectangular frame/space to allow a real photograph to be overlaid later."

## Output
Return valid JSON only. **postAim must be the first substantive field** (required): 1–3 sentences, max 500 characters—audience, intent, and how the visual should support the post.
{
  "postAim": "Required: audience + intent + role of the visual",
  "variation1": {"overallDesign":"","styling":"","igCaption":""},
  "variation2": {"overallDesign":"","styling":"","igCaption":""}
}

Completion rules:
- postAim: Never omit or leave empty.
- overallDesign: Must read as one coherent art direction for the frame (scene + type). Aspect {{aspectNote}}.
- styling: Must reflect brand-appropriate execution without duplicating the scene description.
- igCaption: Full Instagram caption up to 2000 characters—opening hook, complete articulation of the idea (understandable without the image), proof or steps as needed, and a save/share CTA. Max 3 hashtags. Write one cohesive narrative, not a teaser paragraph.`;

const DRAFT_CAROUSEL_LIGHT = `## BRIEF (primary input)
{{idea}}

## CONTEXT
- Language: {{language}}. Format: {{format}}. Aspect: {{aspectNote}}.
- Content goal: {{contentFrameworkDesc}}. Spatial layout: {{layoutSpatialLine}}

## TASK
Create a {{pageCount}}-page Instagram carousel. Each page has **overallDesign** (full slide brief: scene + objects + all text) and **styling** (brand look only). {{overallDesignGuide}} / {{stylingGuide}}
{{#isTextHeavy}}TEXT-HEAVY MODE: Each slide needs substantive content—multiple lines where needed, clear hierarchy, teaching or persuasive depth. Do not under-write.{{/isTextHeavy}}

## Enrichment (CRITICAL)
- The idea is a **seed** only—develop it across slides with teaching or persuasion beats that are not verbatim from the user text.
- If the idea includes "Source: [URL]", the content is from RSS/news. Use the URL and full content for context. Do NOT just repeat the title.
- ENRICH the idea: add scroll-stopping hooks, curiosity gaps, emotional angles. Expand key points. Create value-driven, shareable content.

## Source Image Overlay
- If a [Source Image URL: https...] is provided in the idea, put the layout command in each relevant page's **overallDesign**.

## Output
Return valid JSON only. **postAim is required** (1–3 sentences, max 500 characters): brand- and audience-grounded intent for the whole carousel.
{
  "postAim": "Required: context + intent for the carousel",
  "pages": [
    { "pageIndex": 1, "header": "", "overallDesign": "Full slide: scene + copy + placement", "styling": "Palette, light, mood, medium" },
    ...
  ],
  "igCaption": "Full caption up to 2000 characters: hook, complete narrative across slides, CTA. Max 3 hashtags."
}

Field discipline: each slide overallDesign must stay within ~{{overallMaxChars}} characters (ceiling, not a target to stay far below—text-heavy slides should use most of this). Styling within ~{{stylingMaxChars}} characters. igCaption: one full story that reflects the entire carousel—not a short teaser.`;

export function getSingleImageDraftPromptLight(vars: {
  idea: string;
  language: string;
  format: string;
  layoutSpatialLine: string;
  overallDesignGuide: string;
  stylingGuide: string;
  contentFrameworkDesc: string;
  aspectNote: string;
}): string {
  return replaceAll(DRAFT_SINGLE_LIGHT, {
    ...vars,
    overallMaxChars: String(MAX_ON_IMAGE_INSTRUCTION_CHARS),
    stylingMaxChars: String(MAX_STYLING_CHARS),
  });
}

export function getCarouselDraftPromptLight(vars: {
  pageCount: number;
  idea: string;
  language: string;
  format: string;
  aspectNote: string;
  contentFrameworkDesc: string;
  layoutSpatialLine: string;
  overallDesignGuide: string;
  stylingGuide: string;
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
    layoutSpatialLine: vars.layoutSpatialLine,
    overallDesignGuide: vars.overallDesignGuide,
    stylingGuide: vars.stylingGuide,
    overallMaxChars: String(MAX_ON_IMAGE_INSTRUCTION_CHARS),
    stylingMaxChars: String(MAX_STYLING_CHARS),
  });
}
