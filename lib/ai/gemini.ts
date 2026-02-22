import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const GEMINI_MODELS = ["gemini-3-pro-preview", "gemini-2.5-flash", "gemini-2.5-pro"] as const;

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

/** Parse JSON from model output, fixing common issues. */
function parsePostJson(text: string): { caption: { hook: string; body: string; cta: string; hashtags: string[] }; nanoBananaPrompt: string } | null {
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  let jsonStr = match ? match[0] : cleaned;
  // Fix trailing commas (invalid in strict JSON)
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, "$1");
  // Fix unescaped newlines inside strings (replace with space)
  jsonStr = jsonStr.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (_, inner) =>
    `"${inner.replace(/\r?\n/g, " ")}"`
  );
  try {
    const post = JSON.parse(jsonStr);
    const caption = post.caption || { hook: "", body: "", cta: "", hashtags: [] };
    const nanoBananaPrompt = post.nanoBananaPrompt || post.visualDescription || "";
    return {
      caption: {
        hook: String(caption.hook ?? ""),
        body: String(caption.body ?? ""),
        cta: String(caption.cta ?? ""),
        hashtags: Array.isArray(caption.hashtags) ? caption.hashtags.map(String) : [],
      },
      nanoBananaPrompt: String(nanoBananaPrompt),
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

  const prompt = `You are an expert brand visual design consultant creating a detailed Brand Book for Instagram content.

Brand Information:
- Name: ${brandData.name}
- Type: ${brandData.type}
- Target Audiences: ${audiences}
- Audience Pain Points: ${painPoints}
- Desired Outcomes: ${outcomes}
- Value Proposition: ${valueProp}

${
  brandData.referenceImages && brandData.referenceImages.length > 0
    ? `IMPORTANT: You are being shown ${brandData.referenceImages.length} reference image(s) of the brand's past IG posts. Analyze each image carefully for: colors (extract Hex codes), typography (font styles, sizes), layout (card/minimal/info-dense, borders, spacing), image style (photography/illustration), and mood. Reflect these findings in the brandbook.`
    : "No reference images. Create a cohesive visual system based on the brand information."
}

Output a comprehensive brandbook in JSON. Use English for all content.

{
  "brandPersonality": "2-3 sentences describing the brand's personality and character",
  "toneOfVoice": "2-3 sentences on how the brand communicates (e.g., friendly but professional, direct and punchy)",
  "visualStyle": {
    "colors": ["array of 3-5 Hex codes. First = primary, rest = secondary/accents"],
    "primaryColor": "Main brand Hex code",
    "secondaryColor1": "First accent Hex code",
    "secondaryColor2": "Second accent Hex code",
    "backgroundColor": "white / light / dark",
    "mood": "Overall mood of visuals",
    "imageStyle": "photography / illustration / mixed. Describe style",
    "layoutTendencies": "Common layout patterns",
    "layoutStyle": "card / minimal / info-dense / story",
    "vibe": ["3-5 adjectives for overall feel"],
    "typographySpec": "字型規範: Headings - font, size, color. Body - font, size, color. Emphasis - italic/bold/color. Be specific.",
    "layoutStyleDetail": "排版風格: card / minimal / info-dense / story. Borders - yes/no, color, radius. Spacing - margins, padding. Text placement."
  },
  "captionStructure": {
    "hookPatterns": ["3-5 hook styles that work for this brand"],
    "bodyPatterns": ["3-5 body content patterns"],
    "ctaPatterns": ["3-5 call-to-action patterns"],
    "hashtagStyle": "Hashtag strategy and style"
  },
  "dosAndDonts": {
    "dos": ["5-7 things the brand should do in visuals and captions"],
    "donts": ["5-7 things to avoid: colors, fonts, layouts, tones that would hurt the brand"]
  }
}

Return ONLY valid JSON, no markdown.`;

  const imageParts: Array<{ inlineData: { mimeType: string; data: string } }> = [];
  const validUrls = (brandData.referenceImages ?? []).filter((u) => typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://")));
  for (let i = 0; i < Math.min(validUrls.length, 5); i++) {
    const part = await fetchImagePart(validUrls[i]);
    if (part) imageParts.push(part);
  }

  const contentParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [{ text: prompt }];
  contentParts.push(...imageParts);

  let lastError: unknown = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        safetySettings: [...DEFAULT_SAFETY],
      });
      const result = await model.generateContent(contentParts);
      const response = result.response;
      const text = safeGetText(response);

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
): Promise<{
  caption: {
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
  };
  visualDescription: string;
  nanoBananaPrompt?: string;
}> {
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

  const prompt = `IG post. Brand: ${personality}. Tone: ${tone}. Style: ${style}. Colors: ${colors || "professional palette"}.

Brief: ${idea}
Lang: ${language}. Format: ${format}. Layout: ${postStyle || "immersive-photo"}. Goal: ${contentFramework || "educational-value"}.

Output JSON only:
{"caption":{"hook":"","body":"","cta":"","hashtags":[]},"nanoBananaPrompt":""}
- caption: hook (1-2 lines), body (3-5 sentences), cta, hashtags array
- nanoBananaPrompt: image gen prompt. Scene, composition, colors ${colors || ""}, mood, ${format === "portrait" ? "4:5" : format === "story" || format === "reel-cover" ? "9:16" : "1:1"}. Specific, visual, Instagram-ready.`;

  const modelOrder = preferPro
    ? (["gemini-2.5-flash", "gemini-3-pro-preview", "gemini-2.5-pro"] as const)
    : GEMINI_MODELS;
  const safetyOrder = [DEFAULT_SAFETY, RELAXED_SAFETY] as const;
  let lastError: unknown = null;
  for (const modelName of modelOrder) {
    for (const safetySettings of safetyOrder) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.6, maxOutputTokens: 1024 },
          safetySettings: [...safetySettings],
        });
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = safeGetText(response);

        if (text) {
          const parsed = parsePostJson(text);
          if (parsed) {
            return {
              caption: parsed.caption,
              visualDescription: parsed.nanoBananaPrompt,
              nanoBananaPrompt: parsed.nanoBananaPrompt,
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
  const fallbackCaption = {
    hook: contentIdea.slice(0, 100) + (contentIdea.length > 100 ? "..." : ""),
    body: contentIdea,
    cta: "Follow for more.",
    hashtags: ["#instagram", "#content"],
  };
  const fallbackPrompt = `Professional Instagram post image. ${contentIdea}. Clean, modern style. High-quality, scroll-stopping visual. ${format === "portrait" ? "Portrait 4:5." : format === "story" || format === "reel-cover" ? "Vertical 9:16." : "Square 1:1."}`;
  console.warn("[generatePost] All models failed, using fallback");
  return {
    caption: fallbackCaption,
    visualDescription: fallbackPrompt,
    nanoBananaPrompt: fallbackPrompt,
  };
}
