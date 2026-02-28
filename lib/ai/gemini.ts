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

/** Parse single draft from JSON. */
function parseSingleDraft(post: Record<string, unknown>): DraftOutput {
  const raw = String(post.imageTextOnImage ?? post.imageText ?? "").trim();
  return {
    imageTextOnImage: stripMarkdownFromText(raw),
    visualAdvice: String(post.visualAdvice ?? post.nanoBananaPrompt ?? "").trim(),
    igCaption: String(post.igCaption ?? post.caption ?? "").trim().slice(0, 400),
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
    if (parsed.variation1 && parsed.variation2) {
      return parseSingleDraft(parsed.variation1);
    }
    return parseSingleDraft(parsed);
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
    if (parsed.variation1 && parsed.variation2) {
      return [
        parseSingleDraft(parsed.variation1),
        parseSingleDraft(parsed.variation2),
      ];
    }
    const single = parseSingleDraft(parsed);
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
    layoutTendencies: string;
    layoutStyle?: string;
    vibe?: string[];
    typographySpec?: string;
    layoutStyleDetail?: string;
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

  const prompt = `You are an expert brand visual design consultant. Create a SPECIFIC, ACTIONABLE Brand Book for Instagram. Output each field in concrete, usable form. Use the brand's primary language when appropriate. Max ~300 chars per field unless structure requires more.

## Brand Information
- Name: ${brandData.name}
- Brand Type: ${brandTypeContext}
- Target Audiences: ${audiences}
- Audience Pain Points: ${painPoints}
- Desired Outcomes: ${outcomes}
- Value Proposition: ${valueProp}

${
  brandData.referenceImages && brandData.referenceImages.length > 0
    ? `## Reference Images (${brandData.referenceImages.length} provided)

**IMPORTANT:** Extract and analyze ONLY the actual post content. Ignore status bars, navigation, surrounding UI. Focus on: colors (exact Hex), typography, layout, imagery style. Reflect these findings in the brandbook.`
    : "## No Reference Images\nCreate a cohesive, specific visual system—no generic phrases without concrete details."
}

## Output Format (tailor output for this brand type: ${brandTypeContext})

**toneOfVoice** – Personified role + personality + voice. Examples:
- Personal/creator: "A trusted friend who shares real insights. Warm, direct, no corporate speak."
- E-commerce: "A helpful stylist. Confident, aspirational, product-focused without being pushy."
- B2B/Agency: "A strategic partner. Professional, data-backed, reassuring. Speaks to decision-makers."
- Local business: "A neighborhood expert. Approachable, community-focused, authentic."

**imageStyle** – Technique + subject + image-to-text ratio. DO NOT specify aspect ratio (user chooses later). Examples:
- Illustration: "Digital watercolor. Rounded characters, soft edges. Cover 40% image : 60% text; content 50:50."
- Photography: "Lifestyle product shots. Natural light, clean backgrounds. Minimal text overlay."
- Mixed: "Bold typography over candid photos. High contrast. Text dominates, image supports."

**typographySpec** – Headings, body, hierarchy. Examples:
- Editorial: "Headings: bold sans (e.g. Helvetica Bold). Body: readable serif. Decorative: script for signatures."
- Minimal: "Single font family. Headings = weight 700, body = 400. Generous line height."

**layoutStyleDetail** – Structure, spacing, placement. Examples:
- Card layout: "Rounded corners, subtle shadow. Text block bottom-third. Consistent padding."
- Magazine: "Clear hierarchy. Headline top, subhead, body. Image full-bleed or framed."

**colors** – Hex codes with purpose. Examples:
- Warm: "Primary #E85D04, secondary #F4A261, bg #FFF8F0. Energetic, approachable."
- Cool: "Primary #2C3E50, accent #3498DB, bg #ECF0F1. Professional, trustworthy."

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
    "imageStyle": "string",
    "layoutTendencies": "string",
    "layoutStyle": "string",
    "vibe": ["string"],
    "typographySpec": "string",
    "layoutStyleDetail": "string"
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
            imageStyle: (vs as { imageStyle?: string; image_style?: string }).imageStyle || (vs as { image_style?: string }).image_style || "",
            layoutTendencies: vs.layoutTendencies || "",
            layoutStyle: vs.layoutStyle || "",
            vibe: Array.isArray(vs.vibe) ? vs.vibe : [],
            typographySpec: vs.typographySpec || "",
            layoutStyleDetail: vs.layoutStyleDetail || "",
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

const LAYOUT_TEXT_GUIDE: Record<string, string> = {
  "immersive-photo": "Immersive Visual: No text or minimal (one short tagline). Leave imageTextOnImage blank or a single line. Focus on high-quality photography/graphics.",
  editorial: "Minimalist Editorial: Clean, magazine-like. Output PLAIN TEXT only—NO markdown (#, ##, ###, **). Line 1 = headline. Line 2 = subheadline. Line 3+ = body. Plenty of white space, elegant typography.",
  "text-heavy": "Text-Heavy / Carousel: Bold typography center stage. imageTextOnImage: single impactful line or step headline, plain text only. Perfect for step-by-step guides.",
  "tweet-card": "Tweet / Quote Card: Stylized quote or social post. imageTextOnImage: the key quote, plain text only, no markdown. Attractive background.",
  "split-screen": "Split Screen / Collage: Dynamic mix. imageTextOnImage: Line 1 = headline, Line 2+ = body. Side-by-side or collage layout with text areas.",
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
  contentFramework?: string
): Promise<DraftOutput[]> {
  const idea = truncate(contentIdea, 400);
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
    : Array.isArray(vs?.colors) ? vs.colors.slice(0, 3).join(", ") : "";
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

  const visualLayoutContext = [
    `Visual layout (user chose): ${layout}. ${LAYOUT_TEXT_GUIDE[layout] || ""}`,
    typography ? `Typography: ${typography}` : "",
    layoutDetail ? `Layout: ${layoutDetail}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  const isCarousel = layout === "text-heavy";
  const qualityGuide = isCarousel ? POST_QUALITY_GUIDE.carousel : POST_QUALITY_GUIDE.single;

  const prompt = `You are an IG posts expert and prompt engineer. Create 2 DISTINCT draft variations for the user to choose from.

## Brand & Context
- Brand: ${personality}. Tone: ${tone}. Style: ${style}. Colors: ${colors || "professional palette"}.
- Brand type: ${brandTypeLabel}.
- Content goal (user chose): ${contentFrameworkDesc}
${visualLayoutContext ? `\n${visualLayoutContext}` : ""}

## Quality Focus (apply to BOTH variations)
${qualityGuide}

${POST_QUALITY_GUIDE.outputRules}

## Brief
${idea}
Lang: ${language}. Format: ${format}.

## Output Format
Return JSON only with 2 variations. Make them meaningfully different (e.g. different hooks, angles, or emphasis):
{
  "variation1": {"imageTextOnImage":"","visualAdvice":"","igCaption":""},
  "variation2": {"imageTextOnImage":"","visualAdvice":"","igCaption":""}
}

### Field rules (for each variation):
1. imageTextOnImage: Text to RENDER ON THE IMAGE. ${textGuide} NEVER use markdown (#, ##, ###, **). Output only the actual display text. If no text on image, use "".

2. visualAdvice: 視覺建議. Detailed scene, composition, colors ${colors || ""}, aspect ${aspectNote}. Describe the VISUAL (photo/illustration style, lighting, framing). For editorial: describe how text integrates with image. Be specific about brand alignment.

3. igCaption: Full IG caption. Max 400 chars. Max 3 hashtags at end. Engaging, on-brand, clear, practical.`;

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
