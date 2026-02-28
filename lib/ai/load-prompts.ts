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
2. visualAdvice: Scene, composition, aspect {{aspectNote}}.
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
  return replaceAll(template, {
    personality: vars.personality,
    tone: vars.tone,
    style: vars.style,
    colors: vars.colors,
    contentFrameworkDesc: vars.contentFrameworkDesc,
    layoutGuide: vars.layoutGuide,
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

## User Brief
{{idea}}

Format: {{format}}. Aspect ratio: {{aspectNote}}.

## Output Format
Return valid JSON only:
{
  "pages": [
    { "pageIndex": 1, "header": "Concrete headline", "imageTextOnImage": "Text (use \\n)", "visualAdvice": "Scene + style" },
    ...
  ],
  "igCaption": "Full caption (max 400 chars, max 3 hashtags)."
}`;
