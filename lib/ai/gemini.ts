import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/** Models that require v1beta (Gemini 3). Legacy @google/generative-ai SDK uses v1 only. */
const V1BETA_MODELS = ["gemini-3.1-pro-preview", "gemini-3-pro-preview", "gemini-3-flash-preview"] as const;

const GEMINI_MODELS = ["gemini-3.1-pro-preview", "gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] as const;

const API_BASE_V1BETA = "https://generativelanguage.googleapis.com/v1beta";

type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };

/**
 * Call generateContent via v1beta REST API. Required for Gemini 3 (not in v1).
 * @see https://ai.google.dev/gemini-api/docs/gemini-3
 */
export async function generateContentV1Beta(
  model: string,
  parts: ContentPart[],
  options: { temperature?: number; maxOutputTokens?: number; safetySettings?: Array<{ category: string; threshold: string }>; thinkingLevel?: "low" | "medium" | "high" | "minimal" }
): Promise<{ candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const url = `${API_BASE_V1BETA}/models/${model}:generateContent`;
  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 1.0,
    maxOutputTokens: options.maxOutputTokens ?? 1024,
  };
  if (options.thinkingLevel) {
    generationConfig.thinkingConfig = { thinkingLevel: options.thinkingLevel };
  }
  const body = {
    contents: [{ parts }],
    generationConfig,
    safetySettings: options.safetySettings ?? [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[${res.status}] ${errText}`);
  }

  return (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
}

export function isV1BetaModel(model: string): boolean {
  return (V1BETA_MODELS as readonly string[]).includes(model);
}

export function safetyToV1Beta(
  settings: ReadonlyArray<{ category: (typeof HarmCategory)[keyof typeof HarmCategory]; threshold: (typeof HarmBlockThreshold)[keyof typeof HarmBlockThreshold] }>
): Array<{ category: string; threshold: string }> {
  return settings.map((s) => ({ category: s.category, threshold: s.threshold }));
}

const DEFAULT_SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
] as const;

const RELAXED_SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
] as const;

function safeGetText(response: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }): string | null {
  if (!response.candidates?.length) return null;
  const parts = response.candidates[0].content?.parts ?? [];
  const textPart = parts.find((p) => p.text);
  return textPart?.text?.trim() || null;
}

export type DraftOutput = {
  imageTextOnImage: string;
  visualAdvice: string;
  igCaption: string;
};

/** Strip markdown formatting so it never appears on the image. */
function stripMarkdownFromText(s: string): string {
  return String(s || "")
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();
}

/** Parse JSON from model output, fixing common issues. */
function parsePostJson(text: string): DraftOutput | null {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  let jsonStr = match ? match[0] : cleaned;
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");
  jsonStr = jsonStr.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_, inner) =>
    `"${inner.replace(/\r?\n/g, " ")}"`
  );
  try {
    const post = JSON.parse(jsonStr);
    const raw = String(post.imageTextOnImage ?? post.imageText ?? "").trim();
    return {
      imageTextOnImage: stripMarkdownFromText(raw),
      visualAdvice: String(post.visualAdvice ?? post.nanoBananaPrompt ?? "").trim(),
      igCaption: String(post.igCaption ?? post.caption ?? "").trim().slice(0, 400),
    };
  } catch {
    return null;
  }
}

/** Fetch image from URL and return as Gemini inlineData part. Skips blob: or invalid URLs. */
async function fetchImagePart(url: string): Promise<{ inlineData: { mimeType: string; data: string } } | null> {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const base64 = buf.toString("base64");
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const mimeType = contentType.includes("png") ? "image/png" : contentType.includes("webp") ? "image/webp" : "image/jpeg";
    return { inlineData: { mimeType, data: base64 } };
  } catch {
    return null;
  }
}

// Image generation using Gemini's image generation capabilities
export async function generateImage(prompt: string): Promise<string> {
  try {
    // Use Gemini Pro Vision or Imagen API
    // For now, we'll use a placeholder approach - in production, integrate with Imagen API
    // or use a service like DALL-E, Midjourney, etc.
    
    // Using Gemini to generate a detailed image prompt, then we'll need an actual image generation service
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const imagePrompt = `Create a detailed, Instagram-ready image description for: ${prompt}
    
    The description should be:
    - Specific about colors, composition, and style
    - Suitable for Instagram (1080x1080 for square, 1080x1350 for portrait, etc.)
    - Professional and on-brand
    - Include any text overlays if needed
    
    Return ONLY the image description, no additional text.`;
    
    const result = await model.generateContent(imagePrompt);
    const response = await result.response;
    const description = response.text();
    
    // For now, return a placeholder URL - in production, integrate with actual image generation API
    // You can use Google's Imagen API, DALL-E, Stable Diffusion, etc.
    return `https://via.placeholder.com/1080x1080/4F46E5/FFFFFF?text=${encodeURIComponent(description.substring(0, 50))}`;
  } catch (error) {
    console.error('Error generating image:', error);
    // Return a placeholder on error
    return 'https://via.placeholder.com/1080x1080/4F46E5/FFFFFF?text=Image+Generation+Error';
  }
}

export async function generateBrandbook(
  brandData: {
    name: string;
    type: string;
    targetAudiences: string[];
    painPoints: string[];
    desiredOutcomes: string[];
    valueProposition: string;
    referenceImages?: string[];
  }
): Promise<{
  brandPersonality: string;
  toneOfVoice: string;
  visualStyle: {
    colors: string[];
    primaryColor?: string;
    secondaryColor1?: string;
    secondaryColor2?: string;
    backgroundColor?: string;
    mood: string;
    imageStyle: string;
    layoutTendencies: string;
    layoutStyle?: string;
    vibe?: string[];
    typographySpec?: string;
    layoutStyleDetail?: string;
  };
  captionStructure: {
    hookPatterns: string[];
    bodyPatterns: string[];
    ctaPatterns: string[];
    hashtagStyle: string;
  };
  dosAndDonts: {
    dos: string[];
    donts: string[];
  };
}> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const audiences = brandData.targetAudiences?.length
    ? brandData.targetAudiences.join(", ")
    : "General audience";
  const painPoints = brandData.painPoints?.length
    ? brandData.painPoints.join(", ")
    : "General challenges";
  const outcomes = brandData.desiredOutcomes?.length
    ? brandData.desiredOutcomes.join(", ")
    : "General goals";
  const valueProp = brandData.valueProposition || "Unique value to customers";

  const prompt = `You are an expert brand visual design consultant. Create a SPECIFIC, ACTIONABLE Brand Book for Instagram. Output each field in the format and depth shown in the examples below. Use the brand's primary language (e.g. Traditional Chinese if appropriate). Max ~300 chars per field unless the example shows more structure.

## Brand Information
- Name: ${brandData.name}
- Type: ${brandData.type}
- Target Audiences: ${audiences}
- Audience Pain Points: ${painPoints}
- Desired Outcomes: ${outcomes}
- Value Proposition: ${valueProp}

${
  brandData.referenceImages && brandData.referenceImages.length > 0
    ? `## Reference Images (${brandData.referenceImages.length} provided)

**IMPORTANT:** Extract and analyze ONLY the actual post content. Ignore status bars, navigation, surrounding UI. Focus on: colors (exact Hex), typography, layout, imagery style, mood. Reflect these findings in the brandbook.`
    : "## No Reference Images\nCreate a cohesive, specific visual system—no generic phrases without concrete details."
}

## Output Format (follow these examples closely)

**mood** – Vivid visual description, like: "一張日系療癒風格水彩插畫，圓潤棉花糖般的擬人小貓，一隻黑白奶牛貓戴眼鏡背著黑色背包，表情溫柔可愛。線條乾淨圓滑，顏色柔和，少量陰影，整體像童書封面，給人『今天也辛苦了』的療癒感。"

**toneOfVoice** – Personified role + personality + voice rules, like: "如果要把這個品牌擬人化，他會是：一位溫柔的貓咪心理諮商師。性格：Empathetic、Scientific、Reassuring。口吻：不說教、第一人稱視角代替貓咪說話。"

**typographySpec** (layoutStyleDetail) – Typography & Layout strategy with structure:
字型使用
* 主標題：風格、特徵、範例字體
* 內文：風格、特徵、範例字體
* 裝飾/署名：用途、風格

**imageStyle** – Illustration technique + character design + image-to-text ratio. DO NOT specify aspect ratio (user chooses later). Example:
插畫風格：技法（數位水彩等）、主角設定（形象、配件、表情）、圖文比例（封面、內容頁）

**colors** – Hex codes with purpose and visual 氣質. Example:
整體色調：低飽和度、高明度。主色調：#3E332A、#F9F7F2。輔助色：#8FB995、#E68A81、#AECBDA。視覺氣質：留白適中、線條風格。

## Output
Valid JSON only. No markdown.

{
  "brandPersonality": "string",
  "toneOfVoice": "string",
  "visualStyle": {
    "colors": ["hex", "hex", ...],
    "primaryColor": "hex",
    "secondaryColor1": "hex",
    "secondaryColor2": "hex",
    "backgroundColor": "string",
    "mood": "string",
    "imageStyle": "string",
    "layoutTendencies": "string",
    "layoutStyle": "string",
    "vibe": ["string"],
    "typographySpec": "string",
    "layoutStyleDetail": "string"
  },
  "captionStructure": {
    "hookPatterns": ["string"],
    "bodyPatterns": ["string"],
    "ctaPatterns": ["string"],
    "hashtagStyle": "string"
  },
  "dosAndDonts": {
    "dos": ["string"],
    "donts": ["string"]
  }
}`;

  const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
  const validUrls = (brandData.referenceImages ?? []).filter((u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")));
  for (let i = 0; i < Math.min(validUrls.length, 5); i++) {
    const part = await fetchImagePart(validUrls[i]);
    if (part) imageParts.push(part);
  }

  const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
  contentParts.push(...imageParts);

  let lastError: unknown = null;
  const v1BetaParts: ContentPart[] = contentParts.map((p) =>
    "text" in p ? { text: p.text } : { inlineData: p.inlineData }
  );
  for (const modelName of GEMINI_MODELS) {
    try {
      let text: string | null;
      if (isV1BetaModel(modelName)) {
        const response = await generateContentV1Beta(modelName, v1BetaParts, {
          temperature: 1.0,
          maxOutputTokens: 4096,
          thinkingLevel: "low",
          safetySettings: safetyToV1Beta(DEFAULT_SAFETY),
        });
        text = safeGetText(response);
      } else {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
          safetySettings: [...DEFAULT_SAFETY],
        });
        const result = await model.generateContent(contentParts);
        text = safeGetText(result.response);
      }

      if (text) {
        const cleanedText = text
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const match = cleanedText.match(/\{[\s\S]*\}/);
        const jsonStr = match ? match[0] : cleanedText;
        const brandbook = JSON.parse(jsonStr);
        const vs = brandbook.visualStyle || {};
        return {
          brandPersonality: brandbook.brandPersonality || "",
          toneOfVoice: brandbook.toneOfVoice || "",
          visualStyle: {
            colors: Array.isArray(vs.colors) ? vs.colors : [],
            primaryColor: vs.primaryColor || (Array.isArray(vs.colors) ? vs.colors[0] : ""),
            secondaryColor1: vs.secondaryColor1 || (Array.isArray(vs.colors) ? vs.colors[1] : ""),
            secondaryColor2: vs.secondaryColor2 || (Array.isArray(vs.colors) ? vs.colors[2] : ""),
            backgroundColor: vs.backgroundColor || "light",
            mood: vs.mood || "",
            imageStyle: (vs as { imageStyle?: string; image_style?: string }).imageStyle || (vs as { image_style?: string }).image_style || "",
            layoutTendencies: vs.layoutTendencies || "",
            layoutStyle: vs.layoutStyle || "",
            vibe: Array.isArray(vs.vibe) ? vs.vibe : [],
            typographySpec: vs.typographySpec || "",
            layoutStyleDetail: vs.layoutStyleDetail || "",
          },
          captionStructure: {
            hookPatterns: Array.isArray(brandbook.captionStructure?.hookPatterns)
              ? brandbook.captionStructure.hookPatterns
              : [],
            bodyPatterns: Array.isArray(brandbook.captionStructure?.bodyPatterns)
              ? brandbook.captionStructure.bodyPatterns
              : [],
            ctaPatterns: Array.isArray(brandbook.captionStructure?.ctaPatterns)
              ? brandbook.captionStructure.ctaPatterns
              : [],
            hashtagStyle: brandbook.captionStructure?.hashtagStyle || "",
          },
          dosAndDonts: {
            dos: Array.isArray(brandbook.dosAndDonts?.dos) ? brandbook.dosAndDonts.dos : [],
            donts: Array.isArray(brandbook.dosAndDonts?.donts) ? brandbook.dosAndDonts.donts : [],
          },
        };
      }
      lastError = new Error("Empty or blocked response");
    } catch (err) {
      console.warn(`[generateBrandbook] Model ${modelName} failed:`, err);
      lastError = err;
    }
  }
  const msg = lastError instanceof Error ? lastError.message : "Unknown error";
  throw new Error(`Failed to generate brandbook: ${msg}`);
}

function truncate(s: string, max: number): string {
  const t = String(s || "").trim();
  return t.length <= max ? t : t.slice(0, max) + "...";
}

const LAYOUT_TEXT_GUIDE: Record<string, string> = {
  "immersive-photo": "No text or minimal (one short tagline). Leave imageTextOnImage blank or a single line.",
  editorial: "Magazine layout. Output PLAIN TEXT only—NO markdown (#, ##, ###, **). Use line breaks. Line 1 = headline (主標題). Line 2 = subheadline (副標題). Line 3+ = body (正文). Each line is the actual text only, no labels.",
  "text-heavy": "One big bold headline. imageTextOnImage: single impactful line, plain text only, no markdown.",
  "tweet-card": "Quote card. imageTextOnImage: the key quote, plain text only, no markdown.",
  "split-screen": "Split layout. imageTextOnImage: Line 1 = headline, Line 2+ = body. Plain text only, no markdown.",
};

export async function generatePost(
  brandbook: {
    brandPersonality: string;
    toneOfVoice: string;
    visualStyle: unknown;
    captionStructure: unknown;
    dosAndDonts: unknown;
  },
  contentIdea: string,
  language: string,
  postType: string,
  format: string,
  postStyle?: string,
  preferPro?: boolean,
  contentFramework?: string
): Promise<DraftOutput & { caption?: { hook: string; body: string; cta: string; hashtags: string[] }; visualDescription?: string; nanoBananaPrompt?: string }> {
  const idea = truncate(contentIdea, 400);
  const vs = brandbook.visualStyle as {
    primaryColor?: string;
    secondaryColor1?: string;
    colors?: string[];
    mood?: string;
    imageStyle?: string;
    image_style?: string;
  } | null;
  const colors = vs?.primaryColor
    ? [vs.primaryColor, vs.secondaryColor1].filter(Boolean).join(", ")
    : Array.isArray(vs?.colors) ? vs.colors.slice(0, 3).join(", ") : "";
  const style = vs?.imageStyle || vs?.image_style || "professional";
  const personality = truncate(brandbook.brandPersonality, 200);
  const tone = truncate(brandbook.toneOfVoice, 150);
  const layout = postStyle || "immersive-photo";
  const textGuide = LAYOUT_TEXT_GUIDE[layout] || LAYOUT_TEXT_GUIDE["immersive-photo"];
  const aspectNote = format === "portrait" ? "4:5" : format === "story" || format === "reel-cover" ? "9:16" : "1:1";

  const prompt = `IG post. Brand: ${personality}. Tone: ${tone}. Style: ${style}. Colors: ${colors || "professional palette"}.

Brief: ${idea}
Lang: ${language}. Format: ${format}. Layout: ${layout}. Goal: ${contentFramework || "educational-value"}.

Output JSON only:
{"imageTextOnImage":"","visualAdvice":"","igCaption":""}

1. imageTextOnImage: Text to RENDER ON THE IMAGE. ${textGuide} NEVER use markdown (#, ##, ###, **). Output only the actual display text. If no text on image, use "".

2. visualAdvice: 視覺建議. Detailed scene, composition, colors ${colors || ""}, mood, aspect ${aspectNote}. Describe the VISUAL (photo/illustration style, lighting, framing). For editorial: describe how text integrates with image (e.g. "text overlay in top third, magazine-style typography, image below"). Be specific about brand alignment.

3. igCaption: Full IG caption. Max 400 chars. Max 3 hashtags at end. Engaging, on-brand.`;

  const modelOrder = preferPro
    ? (["gemini-3.1-pro-preview", "gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"] as const)
    : GEMINI_MODELS;
  const safetyOrder = [DEFAULT_SAFETY, RELAXED_SAFETY] as const;
  const parts: ContentPart[] = [{ text: prompt }];
  let lastError: unknown = null;
  for (const modelName of modelOrder) {
    for (const safetySettings of safetyOrder) {
      try {
        let text: string | null;
        if (isV1BetaModel(modelName)) {
          const response = await generateContentV1Beta(modelName, parts, {
            temperature: 1.0,
            maxOutputTokens: 1024,
            thinkingLevel: "low",
            safetySettings: safetyToV1Beta(safetySettings),
          });
          text = safeGetText(response);
        } else {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
            safetySettings: [...safetySettings],
          });
          const result = await model.generateContent(prompt);
          text = safeGetText(result.response);
        }

        if (text) {
          const parsed = parsePostJson(text);
          if (parsed) {
            return {
              ...parsed,
              visualDescription: parsed.visualAdvice,
              nanoBananaPrompt: parsed.visualAdvice,
            };
          }
        }
        lastError = new Error("Empty or blocked response");
      } catch (err) {
        console.warn(`[generatePost] Model ${modelName} failed:`, err);
        lastError = err;
      }
    }
  }
  const fallback: DraftOutput = {
    imageTextOnImage: "",
    visualAdvice: `Professional Instagram post image. ${contentIdea}. Clean, modern style. High-quality, scroll-stopping visual. ${format === "portrait" ? "Portrait 4:5." : format === "story" || format === "reel-cover" ? "Vertical 9:16." : "Square 1:1."}`,
    igCaption: `${contentIdea.slice(0, 200)}${contentIdea.length > 200 ? "..." : ""}\n\nFollow for more.\n\n#instagram #content`,
  };
  console.warn("[generatePost] All models failed, using fallback");
  return {
    ...fallback,
    visualDescription: fallback.visualAdvice,
    nanoBananaPrompt: fallback.visualAdvice,
  };
}
