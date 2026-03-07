import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import {
  getBrandbookPrompt,
  getSingleImageDraftPrompt,
  getCarouselDraftPrompt,
  getSingleImageDraftPromptLight,
  getCarouselDraftPromptLight,
} from "./load-prompts";

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
  postAim?: string;
};

export type CarouselPageDraft = {
  pageIndex: number;
  header: string;
  imageTextOnImage: string;
  visualAdvice: string;
};

export type CarouselDraftOutput = {
  pages: CarouselPageDraft[];
  igCaption: string;
  postAim?: string;
};

/** Strip markdown formatting so it never appears on the image. Keep hierarchy labels (主標題：, 副標題：, 內文：) — the image generator understands them. */
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

/** Parse single draft from JSON. */
function parseSingleDraft(post: Record<string, unknown>, postAim?: string): DraftOutput {
  const raw = String(post.imageTextOnImage ?? post.imageText ?? "").trim();
  return {
    imageTextOnImage: stripMarkdownFromText(raw),
    visualAdvice: String(post.visualAdvice ?? post.nanoBananaPrompt ?? "").trim(),
    igCaption: String(post.igCaption ?? post.caption ?? "").trim().slice(0, 1000),
    postAim: postAim || (typeof post.postAim === "string" ? post.postAim : undefined),
  };
}

/** Parse JSON from model output, fixing common issues. Returns single draft or null. */
function parsePostJson(text: string): DraftOutput | null {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  let jsonStr = match ? match[0] : cleaned;
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");
  jsonStr = jsonStr.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_, inner) =>
    `"${inner.replace(/\r?\n/g, " ")}"`
  );
  try {
    const parsed = JSON.parse(jsonStr);
    const postAim = typeof parsed.postAim === "string" ? parsed.postAim.trim() : undefined;
    if (parsed.variation1 && parsed.variation2) {
      return parseSingleDraft(parsed.variation1, postAim);
    }
    return parseSingleDraft(parsed, postAim);
  } catch {
    return null;
  }
}

/** Parse 2 variations from model output. */
function parsePostJsonVariations(text: string): DraftOutput[] | null {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  let jsonStr = match ? match[0] : cleaned;
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");
  jsonStr = jsonStr.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_, inner) =>
    `"${inner.replace(/\r?\n/g, " ")}"`
  );
  try {
    const parsed = JSON.parse(jsonStr);
    const postAim = typeof parsed.postAim === "string" ? parsed.postAim.trim() : undefined;
    if (parsed.variation1 && parsed.variation2) {
      return [
        parseSingleDraft(parsed.variation1, postAim),
        parseSingleDraft(parsed.variation2, postAim),
      ];
    }
    const single = parseSingleDraft(parsed, postAim);
    return [single, { ...single }];
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

const BRAND_TYPE_GUIDANCE: Record<string, string> = {
  "personal-brand": "Personal Brand / Creator: Tailor for individuals building authority. Warm, authentic, thought-leader tone.",
  "ecommerce-retail": "E-commerce / Retail: Product-focused, aspirational. Lifestyle imagery, clear CTAs, shoppable feel.",
  "service-agency": "Service Provider / Agency: Professional, results-oriented. Case studies, expertise, trust signals.",
  "local-business": "Local Business / Brick & Mortar: Community-focused, approachable. Local relevance, neighborhood feel.",
  "tech-startup": "Tech / Software / Startup: Modern, innovative. Clean aesthetics, product demos, growth mindset.",
  "community-nonprofit": "Community / Non-Profit: Mission-driven, inclusive. Impact stories, calls to action, authenticity.",
  other: "Other: Adapt to the brand's unique positioning based on the details provided.",
};

export async function generateBrandbook(
  brandData: {
    name: string;
    type: string;
    otherBrandType?: string;
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
    imageStyle: string;
    carouselInnerStyle?: string;
    colorDescriptionDetailed?: string;
    visualAura?: string;
    lineStyle?: string;
    layoutTendencies: string;
    layoutStyle?: string;
    vibe?: string[];
    typographySpec?: string;
    layoutStyleDetail?: string;
    imageGenerationPrompt?: string;
  };
  /** Kept for DB compatibility; always empty (not generated). */
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

  const brandTypeLabel = BRAND_TYPE_GUIDANCE[brandData.type] || BRAND_TYPE_GUIDANCE.other;
  const brandTypeContext = brandData.type === "other" && brandData.otherBrandType?.trim()
    ? `Other (user specified: "${brandData.otherBrandType.trim()}")`
    : brandTypeLabel;

  const hasRefImages = brandData.referenceImages && brandData.referenceImages.length > 0;
  const refImagesSection = hasRefImages
    ? `## CRITICAL: Reference Images (${brandData.referenceImages!.length} sample posts attached below)

**YOU MUST analyze the attached images.** They are the user's actual IG posts or style references. Your output MUST be derived from what you see—not generic templates.

**Style extraction (highest priority):**
1. **Art/medium style**: Name the exact style (e.g. watercolor, oil painting, flat design, minimal line art, collage, photography, illustration, hand-drawn, digital art). If watercolor—say "watercolor". If mixed media—describe it.
2. **Colors**: Extract hex codes from the images. Use them in colors array and colorDescriptionDetailed.
3. **Texture & mood**: Paper texture, brush strokes, saturation, brightness. e.g. "watercolor on paper, soft bleed, muted tones".
4. **Typography**: Font style, weights, hierarchy you see.
5. **Layout**: Text placement, spacing, image-to-text ratio.
6. **Ignore** status bars, navigation, UI chrome—focus only on post content.
7. **Do NOT** output generic content. Every field must reflect the visual language of the provided images.
8. **Translate subjects into reusable principles**: When a sample shows a specific subject (e.g. sculpture, character, product), extract the HOW it is presented—composition, lighting, style, mood, texture—and write that as a principle that can apply to different subjects. Example: a sculpture in one sample → "3D objects or tangible focal points with dramatic side lighting and clean negative space" (not "include a sculpture"). A mascot character → "approachable character illustrations with soft expressions and [specific art style]" (not "a tuxedo cat"). The brandbook must be specific enough to guide image generation, but written as principles so different post topics can use the same style.`
    : "## No Reference Images\nCreate a cohesive, highly specific visual system. No generic phrases—every detail must be concrete and usable for image generation.";

  const prompt = getBrandbookPrompt({
    brandName: brandData.name,
    brandTypeContext,
    audiences,
    painPoints: painPoints,
    outcomes,
    valueProp,
    refImagesSection,
  });

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
          maxOutputTokens: 2048,
          thinkingLevel: "low",
          safetySettings: safetyToV1Beta(DEFAULT_SAFETY),
        });
        text = safeGetText(response);
      } else {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
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
            colors: Array.isArray(vs.colors)
              ? (() => {
                  const arr = vs.colors.slice(0, 5).map((c: unknown) => (c && String(c).trim()) || "");
                  while (arr.length < 5) arr.push("");
                  return arr;
                })()
              : ["", "", "", "", ""],
            primaryColor: vs.primaryColor || (Array.isArray(vs.colors) ? vs.colors[0] : ""),
            secondaryColor1: vs.secondaryColor1 || (Array.isArray(vs.colors) ? vs.colors[1] : ""),
            secondaryColor2: vs.secondaryColor2 || (Array.isArray(vs.colors) ? vs.colors[2] : ""),
            backgroundColor: vs.backgroundColor || "light",
            imageStyle: (vs as { imageStyle?: string; image_style?: string }).imageStyle || (vs as { image_style?: string }).image_style || "",
            carouselInnerStyle: (vs as { carouselInnerStyle?: string }).carouselInnerStyle || "",
            colorDescriptionDetailed: (vs as { colorDescriptionDetailed?: string }).colorDescriptionDetailed || "",
            visualAura: (vs as { visualAura?: string }).visualAura || "",
            lineStyle: (vs as { lineStyle?: string }).lineStyle || "",
            layoutTendencies: vs.layoutTendencies || "",
            layoutStyle: vs.layoutStyle || "",
            vibe: Array.isArray(vs.vibe) ? vs.vibe : [],
            typographySpec: vs.typographySpec || "",
            layoutStyleDetail: vs.layoutStyleDetail || "",
            imageGenerationPrompt: (vs as { imageGenerationPrompt?: string }).imageGenerationPrompt || "",
          },
          captionStructure: {
            hookPatterns: [],
            bodyPatterns: [],
            ctaPatterns: [],
            hashtagStyle: "",
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

function formatDosAndDonts(dosAndDonts: unknown): string {
  const d = dosAndDonts as { dos?: string[]; donts?: string[] } | null | undefined;
  if (!d) return "";
  const dos = Array.isArray(d.dos) ? d.dos.filter(Boolean).slice(0, 5) : [];
  const donts = Array.isArray(d.donts) ? d.donts.filter(Boolean).slice(0, 5) : [];
  if (dos.length === 0 && donts.length === 0) return "";
  const parts: string[] = [];
  if (dos.length > 0) parts.push(`Do: ${dos.join("; ")}`);
  if (donts.length > 0) parts.push(`Don't: ${donts.join("; ")}`);
  return parts.join(". ");
}

const LAYOUT_SPATIAL_DIRECTIVES: Record<string, string> = {
  "magazine-editorial": "MAGAZINE EDITORIAL LAYOUT: Edge-to-edge full-bleed background. Leave generous negative space at the absolute top for a massive masthead (Headline). Place the primary subject centrally. Leave smaller pockets of negative space on borders for subheadlines.",
  "cinematic-poster": "CINEMATIC POSTER LAYOUT: Dramatic composition. Center the main subject perfectly. Leave a horizontal band of negative space across the middle for a Title. Leave a small band of empty space at the absolute bottom for body text.",
  "immersive-visual": "IMMERSIVE VISUAL LAYOUT: Edge-to-edge subject focus. Do not force large blocks of negative space. The image should be rich and full, as text will be minimally overlaid.",
  "split-screen": "SPLIT-SCREEN LAYOUT: Use a sharp geometric division (vertical or horizontal split). One half must be completely clean negative space strictly for text. The other half contains the visual subject.",
  "text-top": "BOTTOM-HEAVY SUBJECT LAYOUT: Anchor the main subject or illustration heavily at the absolute bottom of the frame. Ensure the top 40% of the canvas is clean, uncluttered negative space for top-aligned typography.",
  "text-bottom": "TOP-HEAVY SUBJECT LAYOUT: Anchor the main subject or illustration at the top or upper-center. Ensure the bottom 40% of the canvas is clean, uncluttered negative space for bottom-aligned typography.",
  "text-heavy-infographic": "INFOGRAPHIC GRID LAYOUT: Highly structured. Do not generate a massive hero subject. Use a clean background with small, supportive graphical motifs. Maximize whitespace (80% empty) to accommodate dense, multi-point typography.",
  "quote-card": "STATEMENT CARD LAYOUT: Extreme minimalism. The text is the hero. Generate a beautifully textured, soft, or abstract background with ZERO distracting subjects. Ensure 90% negative space for massive, centered typography.",
  "immersive-photo": "IMMERSIVE VISUAL LAYOUT: Edge-to-edge subject focus. Do not force large blocks of negative space. The image should be rich and full, as text will be minimally overlaid.",
  editorial: "MAGAZINE EDITORIAL LAYOUT: Edge-to-edge full-bleed background. Leave generous negative space at the absolute top for a massive masthead (Headline). Place the primary subject centrally. Leave smaller pockets of negative space on borders for subheadlines.",
  "text-heavy": "INFOGRAPHIC GRID LAYOUT: Highly structured. Do not generate a massive hero subject. Use a clean background with small, supportive graphical motifs. Maximize whitespace (80% empty) to accommodate dense, multi-point typography.",
  "tweet-card": "STATEMENT CARD LAYOUT: Extreme minimalism. The text is the hero. Generate a beautifully textured, soft, or abstract background with ZERO distracting subjects. Ensure 90% negative space for massive, centered typography.",
};

const LAYOUT_TEXT_GUIDE: Record<string, string> = {
  "magazine-editorial": "Minimalist Editorial: Clean, magazine-like. Output PLAIN TEXT only—NO markdown. Line 1 = main headline. Line 2 = subheadline. Line 3+ = body. Plenty of white space, elegant typography. Be substantive—2–4 lines.",
  "cinematic-poster": "Cinematic Poster: Line 1 = title. Line 2+ = supporting text. Bold, dramatic typography. Plain text only, no markdown.",
  "immersive-visual": "Immersive Visual: No text or minimal (one short tagline). Leave imageTextOnImage blank or a single line. Focus on high-quality photography/graphics.",
  "split-screen": "Split Screen: Line 1 = main headline, Line 2+ = body. Be substantive. Plain text only, no markdown.",
  "text-top": "Text Top: Headline and subheadline at top. Line 1 = headline, Line 2 = subheadline, Line 3+ = body. Plain text only.",
  "text-bottom": "Image Top / Text Bottom: Headline and body at bottom. Line 1 = headline, Line 2+ = body. Plain text only.",
  "text-heavy-infographic": "Text-Heavy / Infographic: Bold typography center stage. imageTextOnImage: 2–5 lines (main headline 主標題 + subheadline + body). Up to 200 chars per slide. Plain text only, no markdown.",
  "quote-card": "Quote / Tweet Card: Stylized quote. imageTextOnImage: the key quote (2–3 lines), plain text only, no markdown.",
  "immersive-photo": "Immersive Visual: No text or minimal (one short tagline). Leave imageTextOnImage blank or a single line. Focus on high-quality photography/graphics.",
  editorial: "Minimalist Editorial: Clean, magazine-like. Output PLAIN TEXT only—NO markdown. Line 1 = main headline. Line 2 = subheadline. Line 3+ = body.",
  "text-heavy": "Text-Heavy / Infographic: Bold typography center stage. imageTextOnImage: 2–5 lines. Up to 200 chars per slide. Plain text only, no markdown.",
  "tweet-card": "Quote / Tweet Card: Stylized quote. imageTextOnImage: the key quote (2–3 lines), plain text only, no markdown.",
};

/** Single post (單頁圖表): impress target audience. Carousel (複頁教學貼文): save value. */
const POST_QUALITY_GUIDE = {
  single: `【單頁圖表 Single Post】目標：impress 目標受眾
- 讓陌生人快速明白一個觀念
- 建立「我有料」的第一印象
- 令人停一停，覺得「哦，原來係咁」
- 文字精煉、一圖說清，適合快速滑動時抓住注意力`,

  carousel: `【複頁教學貼文 Carousel】目標：保存價值
- 深入解釋一個實用主題
- 令人想 Save、Share
- 培養信任，為之後查詢／轉化鋪路
- 每頁有明確價值，整體有邏輯、可收藏`,

  outputRules: `### 輸出要求（很重要）：
- 避免與品牌定位無關的內容（例如旅遊、食譜、純娛樂）
- 所有建議都必須能夠幫助吸引「正確受眾」
- 語氣清晰、實用，不需要行銷話術`,
};

const CONTENT_FRAMEWORK_GUIDE: Record<string, string> = {
  "educational-value": "Educational / Value: Share tips, tutorials, or actionable advice. Teach the audience. Value-first, informative tone.",
  "engagement-relatable": "Engagement / Relatable: Spark conversations. Use memes, relatable situations, or questions. Conversational, shareable.",
  "promotional-proof": "Promotional / Proof: Highlight products/services, testimonials, or sales. Proof-driven, conversion-focused.",
  "storytelling": "Storytelling / Behind the Scenes: Build connection. Share journey, team, or processes. Authentic, narrative-driven.",
};

/**
 * Lightweight draft generation - no brandbook needed.
 * Brandbook is only used at image generation stage.
 */
export async function generatePostLight(
  contentIdea: string,
  language: string,
  postType: string,
  format: string,
  postStyle: string,
  contentFramework?: string,
  carouselPageCount?: number
): Promise<DraftOutput[] | CarouselDraftOutput> {
  const idea = truncate(contentIdea, 1000);
  const contentFrameworkDesc =
    CONTENT_FRAMEWORK_GUIDE[contentFramework || "educational-value"] ||
    CONTENT_FRAMEWORK_GUIDE["educational-value"];
  const aspectNote =
    format === "portrait" ? "4:5" : format === "story" || format === "reel-cover" ? "9:16" : "1:1";
  const layoutGuide = LAYOUT_TEXT_GUIDE[postStyle || "immersive-photo"] || LAYOUT_TEXT_GUIDE["immersive-photo"];

  const isCarousel =
    postType === "carousel" && typeof carouselPageCount === "number" && carouselPageCount >= 1 && carouselPageCount <= 9;

  if (isCarousel) {
    const pageCount = carouselPageCount!;
    const isTextHeavy = postStyle === "text-heavy";
    const layoutGuide = LAYOUT_TEXT_GUIDE[postStyle || "immersive-photo"] || LAYOUT_TEXT_GUIDE["immersive-photo"];
    const prompt = getCarouselDraftPromptLight({
      pageCount,
      idea,
      language,
      format,
      aspectNote,
      contentFrameworkDesc,
      layoutGuide,
      isTextHeavy,
    });
    const parts: ContentPart[] = [{ text: prompt }];
    for (const modelName of GEMINI_MODELS) {
      try {
        let text: string | null;
        if (isV1BetaModel(modelName)) {
          const response = await generateContentV1Beta(modelName, parts, {
            temperature: 0.8,
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
          const result = await model.generateContent(prompt);
          text = safeGetText(result.response);
        }
        if (text) {
          const carousel = parseCarouselJson(text, pageCount);
          if (carousel && carousel.pages.length >= 1) return carousel;
        }
      } catch (err) {
        console.warn(`[generatePostLight] Carousel ${modelName} failed:`, err);
      }
    }
    const fallbackPages: CarouselPageDraft[] = [];
    for (let i = 0; i < pageCount; i++) {
      fallbackPages.push({
        pageIndex: i + 1,
        header: `Slide ${i + 1}`,
        imageTextOnImage: i === 0 ? idea.slice(0, 100) : "",
        visualAdvice: `Professional Instagram carousel page ${i + 1}. ${idea}.`,
      });
    }
    return { pages: fallbackPages, igCaption: `${idea.slice(0, 200)}...\n\n#instagram`, postAim: idea.slice(0, 100) };
  }

  const prompt = getSingleImageDraftPromptLight({
    idea,
    language,
    format,
    layout: layoutGuide,
    contentFrameworkDesc,
    aspectNote,
  });
  const parts: ContentPart[] = [{ text: prompt }];
  for (const modelName of GEMINI_MODELS) {
    try {
      let text: string | null;
      if (isV1BetaModel(modelName)) {
          const response = await generateContentV1Beta(modelName, parts, {
          temperature: 0.9,
          maxOutputTokens: 2048,
          thinkingLevel: "low",
          safetySettings: safetyToV1Beta(DEFAULT_SAFETY),
        });
        text = safeGetText(response);
      } else {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.8, maxOutputTokens: 2048 },
          safetySettings: [...DEFAULT_SAFETY],
        });
        const result = await model.generateContent(prompt);
        text = safeGetText(result.response);
      }
      if (text) {
        const variations = parsePostJsonVariations(text);
        if (variations && variations.length >= 2) return variations;
        const single = parsePostJson(text);
        if (single) return [single, { ...single }];
      }
    } catch (err) {
      console.warn(`[generatePostLight] ${modelName} failed:`, err);
    }
  }
  const fallback: DraftOutput = {
    imageTextOnImage: "",
    visualAdvice: `Professional Instagram post. ${idea}. Clean, modern. Aspect ${aspectNote}.`,
    igCaption: `${idea.slice(0, 200)}...\n\n#instagram`,
    postAim: idea.slice(0, 100),
  };
  return [fallback, { ...fallback }];
}

/** Parse carousel JSON from model output. */
function parseCarouselJson(text: string, pageCount: number): CarouselDraftOutput | null {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  let jsonStr = match ? match[0] : cleaned;
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");
  jsonStr = jsonStr.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_, inner) =>
    `"${inner.replace(/\r?\n/g, " ")}"`
  );
  try {
    const parsed = JSON.parse(jsonStr);
    const pagesRaw = Array.isArray(parsed.pages) ? parsed.pages : [];
    const pages: CarouselPageDraft[] = [];
    for (let i = 0; i < pageCount; i++) {
      const p = pagesRaw[i] ?? {};
      pages.push({
        pageIndex: i + 1,
        header: String(p.header ?? p.title ?? `Page ${i + 1}`).trim(),
        imageTextOnImage: stripMarkdownFromText(String(p.imageTextOnImage ?? p.imageText ?? "")),
        visualAdvice: String(p.visualAdvice ?? p.nanoBananaPrompt ?? "").trim(),
      });
    }
    return {
      pages,
      igCaption: String(parsed.igCaption ?? parsed.caption ?? "").trim().slice(0, 1000),
      postAim: typeof parsed.postAim === "string" ? parsed.postAim.trim() : undefined,
    };
  } catch {
    return null;
  }
}

export async function generatePost(
  brandbook: {
    brandPersonality: string;
    toneOfVoice: string;
    visualStyle: unknown;
    dosAndDonts: unknown;
    brandType?: string;
    otherBrandType?: string;
  },
  contentIdea: string,
  language: string,
  postType: string,
  format: string,
  postStyle?: string,
  preferPro?: boolean,
  contentFramework?: string,
  carouselPageCount?: number
): Promise<DraftOutput[] | CarouselDraftOutput> {
  const idea = truncate(contentIdea, 1000);
  const isCarouselPost = postType === "carousel" && typeof carouselPageCount === "number" && carouselPageCount >= 1 && carouselPageCount <= 9;

  if (isCarouselPost) {
    const pageCount = carouselPageCount!;
    const vs = brandbook.visualStyle as {
      primaryColor?: string;
      secondaryColor1?: string;
      colors?: string[];
      imageStyle?: string;
      image_style?: string;
      typographySpec?: string;
      layoutStyleDetail?: string;
    } | null;
    const colors = vs?.primaryColor
      ? [vs.primaryColor, vs.secondaryColor1].filter(Boolean).join(", ")
      : Array.isArray(vs?.colors) ? vs.colors.filter((c) => c && String(c).trim()).slice(0, 5).join(", ") : "";
    const style = vs?.imageStyle || vs?.image_style || "professional";
    const personality = truncate(brandbook.brandPersonality, 200);
    const tone = truncate(brandbook.toneOfVoice, 150);
    const aspectNote = format === "portrait" ? "4:5" : format === "story" || format === "reel-cover" ? "9:16" : "1:1";

    const isTextHeavy = postStyle === "text-heavy-infographic" || postStyle === "text-heavy";
    const layoutGuide = LAYOUT_SPATIAL_DIRECTIVES[postStyle || "text-heavy-infographic"] || LAYOUT_SPATIAL_DIRECTIVES["text-heavy-infographic"];
    const textGuide = LAYOUT_TEXT_GUIDE[postStyle || "text-heavy-infographic"] || LAYOUT_TEXT_GUIDE["text-heavy-infographic"];
    const dosDonts = formatDosAndDonts(brandbook.dosAndDonts);
    const layoutStyleDetail = truncate((vs as { layoutStyleDetail?: string })?.layoutStyleDetail || "", 200);

    const carouselPrompt = getCarouselDraftPrompt({
      pageCount,
      language,
      personality,
      tone,
      style,
      colors: colors || "professional palette",
      contentFrameworkDesc: CONTENT_FRAMEWORK_GUIDE[contentFramework || "educational-value"] || CONTENT_FRAMEWORK_GUIDE["educational-value"],
      layoutGuide,
      layoutStyleDetail,
      dosDonts,
      textGuide,
      idea,
      format,
      aspectNote,
      isTextHeavy,
    });

    const modelOrder = preferPro
      ? (["gemini-3.1-pro-preview", "gemini-3-pro-preview", "gemini-3-flash-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"] as const)
      : GEMINI_MODELS;
    const safetyOrder = [DEFAULT_SAFETY, RELAXED_SAFETY] as const;
    const parts: ContentPart[] = [{ text: carouselPrompt }];
    for (const modelName of modelOrder) {
      for (const safetySettings of safetyOrder) {
        try {
          let text: string | null;
          if (isV1BetaModel(modelName)) {
          const response = await generateContentV1Beta(modelName, parts, {
            temperature: 0.8,
            maxOutputTokens: 4096,
            thinkingLevel: "low",
              safetySettings: safetyToV1Beta(safetySettings),
            });
            text = safeGetText(response);
          } else {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
            safetySettings: [...safetySettings],
          });
          const result = await model.generateContent(carouselPrompt);
            text = safeGetText(result.response);
          }
          if (text) {
            const carousel = parseCarouselJson(text, pageCount);
            if (carousel && carousel.pages.length >= 1) return carousel;
          }
        } catch (err) {
          console.warn(`[generatePost] Carousel model ${modelName} failed:`, err);
        }
      }
    }
    const fallbackPages: CarouselPageDraft[] = [];
    const fallbackHeaders = ["Key Insight", "The Problem", "The Solution", "Action Steps", "Key Takeaway", "Summary", "Next Steps", "CTA", "Conclusion"];
    for (let i = 0; i < pageCount; i++) {
      fallbackPages.push({
        pageIndex: i + 1,
        header: fallbackHeaders[i] || `Slide ${i + 1}`,
        imageTextOnImage: i === 0 ? idea.slice(0, 100) : "",
        visualAdvice: `Professional Instagram carousel page ${i + 1}. ${idea}. Clean, modern style.`,
      });
    }
    return { pages: fallbackPages, igCaption: `${idea.slice(0, 200)}...\n\n#instagram #content` };
  }

  const vs = brandbook.visualStyle as {
    primaryColor?: string;
    secondaryColor1?: string;
    colors?: string[];
    imageStyle?: string;
    image_style?: string;
    typographySpec?: string;
    layoutStyleDetail?: string;
  } | null;
  const colors = vs?.primaryColor
    ? [vs.primaryColor, vs.secondaryColor1].filter(Boolean).join(", ")
    : Array.isArray(vs?.colors) ? vs.colors.filter((c) => c && String(c).trim()).slice(0, 5).join(", ") : "";
  const style = vs?.imageStyle || vs?.image_style || "professional";
  const typography = truncate(vs?.typographySpec || "", 150);
  const layoutDetail = truncate(vs?.layoutStyleDetail || "", 150);
  const personality = truncate(brandbook.brandPersonality, 200);
  const tone = truncate(brandbook.toneOfVoice, 150);
  const layout = postStyle || "immersive-photo";
  const textGuide = LAYOUT_TEXT_GUIDE[layout] || LAYOUT_TEXT_GUIDE["immersive-photo"];
  const aspectNote = format === "portrait" ? "4:5" : format === "story" || format === "reel-cover" ? "9:16" : "1:1";

  const contentFrameworkDesc = CONTENT_FRAMEWORK_GUIDE[contentFramework || "educational-value"] || CONTENT_FRAMEWORK_GUIDE["educational-value"];
  const brandTypeLabel = brandbook.brandType === "other" && brandbook.otherBrandType?.trim()
    ? `Other (${brandbook.otherBrandType.trim()})`
    : BRAND_TYPE_GUIDANCE[brandbook.brandType || ""]?.split(":")[0] || brandbook.brandType || "";

  const spatialDirective = LAYOUT_SPATIAL_DIRECTIVES[layout] || LAYOUT_SPATIAL_DIRECTIVES["immersive-visual"];
  const dosDonts = formatDosAndDonts(brandbook.dosAndDonts);
  const visualLayoutContext = [
    `Visual layout (user chose): ${layout}. ${spatialDirective}`,
    typography ? `Typography: ${typography}` : "",
    layoutDetail ? `Layout: ${layoutDetail}` : "",
    dosDonts ? `Brand rules: ${dosDonts}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  const isCarousel = layout === "text-heavy";
  const qualityGuide = isCarousel ? POST_QUALITY_GUIDE.carousel : POST_QUALITY_GUIDE.single;

  const prompt = getSingleImageDraftPrompt({
    personality,
    tone,
    style,
    colors: colors || "professional palette",
    brandTypeLabel,
    contentFrameworkDesc,
    visualLayoutContext: visualLayoutContext || "",
    qualityGuide,
    idea,
    language,
    format,
    textGuide,
    aspectNote,
  });

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
            maxOutputTokens: 2048,
            thinkingLevel: "low",
            safetySettings: safetyToV1Beta(safetySettings),
          });
          text = safeGetText(response);
        } else {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: { temperature: 0.6, maxOutputTokens: 2048 },
            safetySettings: [...safetySettings],
          });
          const result = await model.generateContent(prompt);
          text = safeGetText(result.response);
        }

        if (text) {
          const variations = parsePostJsonVariations(text);
          if (variations && variations.length >= 2) {
            return variations;
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
  return [fallback, { ...fallback }];
}
