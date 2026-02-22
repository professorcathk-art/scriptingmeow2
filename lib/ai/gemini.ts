import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash"] as const;

const DEFAULT_SAFETY = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
] as const;

function safeGetText(response: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }): string | null {
  if (!response.candidates?.length) return null;
  const part = response.candidates[0].content?.parts?.[0];
  return part?.text?.trim() || null;
}

// Image generation using Gemini's image generation capabilities
export async function generateImage(prompt: string): Promise<string> {
  try {
    // Use Gemini Pro Vision or Imagen API
    // For now, we'll use a placeholder approach - in production, integrate with Imagen API
    // or use a service like DALL-E, Midjourney, etc.
    
    // Using Gemini to generate a detailed image prompt, then we'll need an actual image generation service
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
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
    ? `Reference: The brand has uploaded ${brandData.referenceImages.length} reference images. Analyze their visual style (colors, typography, layout, mood) and reflect it in the brandbook.`
    : "No reference images. Create a cohesive visual system based on the brand information."
}

Output a comprehensive brandbook in JSON. Use English for all content.

{
  "brandPersonality": "2-3 sentences describing the brand's personality and character",
  "toneOfVoice": "2-3 sentences on how the brand communicates (e.g., friendly but professional, direct and punchy)",
  "visualStyle": {
    "colors": ["array of 3-5 Hex codes, e.g. #5E66C2, #FF6B35, #2EC4B6. First = primary, rest = secondary/accents"],
    "primaryColor": "Main brand Hex code, e.g. #5E66C2",
    "secondaryColor1": "First accent Hex code",
    "secondaryColor2": "Second accent Hex code",
    "backgroundColor": "white / light / dark - for post backgrounds",
    "mood": "Overall mood of visuals (e.g., warm and inviting, bold and energetic, calm and premium)",
    "imageStyle": "photography / illustration / mixed. Describe style: minimalist, vibrant, editorial, lifestyle, product-focused, etc.",
    "layoutTendencies": "card-style / minimal / info-dense / story-driven. Describe: borders, rounded corners, spacing, text placement",
    "layoutStyle": "card / minimal / info-dense / story",
    "vibe": ["3-5 adjectives for overall feel, e.g. professional yet approachable, modern, clean, trustworthy"]
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

  let lastError: unknown = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        safetySettings: [...DEFAULT_SAFETY],
      });
      const result = await model.generateContent(prompt);
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
  format: string
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
  const vs = brandbook.visualStyle as {
    primaryColor?: string;
    secondaryColor1?: string;
    secondaryColor2?: string;
    colors?: string[];
    mood?: string;
    imageStyle?: string;
    layoutStyle?: string;
    vibe?: string[];
  } | null;
  const colors = vs?.primaryColor
    ? [vs.primaryColor, vs.secondaryColor1, vs.secondaryColor2].filter(Boolean).join(", ")
    : Array.isArray(vs?.colors) ? vs.colors.join(", ") : "";
  const vibeStr = Array.isArray(vs?.vibe) ? vs.vibe.join(", ") : vs?.mood || "";

  const prompt = `You are an expert IG content strategist and copywriter. Create an Instagram post that follows the brandbook strictly.

Brandbook:
- Personality: ${brandbook.brandPersonality}
- Tone of Voice: ${brandbook.toneOfVoice}
- Visual Style: ${JSON.stringify(brandbook.visualStyle)}
- Caption Structure: ${JSON.stringify(brandbook.captionStructure)}
- Do's and Don'ts: ${JSON.stringify(brandbook.dosAndDonts)}

Post Brief:
- Content Idea: ${contentIdea}
- Language: ${language}
- Post Type: ${postType}
- Format: ${format}

Output JSON with two parts:

1. "caption": {
  "hook": "Strong, scroll-stopping hook (1-2 lines). Direct, curiosity-driven or emotionally resonant.",
  "body": "Main content (3-5 sentences). Use second person 'you'. Clear value, no fluff.",
  "cta": "Clear call-to-action. Invite to save, comment, or follow.",
  "hashtags": ["5-10 relevant hashtags"]
}

2. "nanoBananaPrompt": A complete, detailed prompt for AI image generation (Nano Banana / Gemini). This will be used to generate the post visual. Requirements:
- Describe the SCENE and COMPOSITION in detail (what is shown, layout, framing)
- Include EXACT brand colors: ${colors || "use a cohesive, professional palette"}
- Specify the MOOD and VIBE: ${vibeStr || "professional, engaging"}
- Match the IMAGE STYLE from brandbook: ${vs?.imageStyle || "professional"}
- For single-image: one cohesive visual. For carousel: describe the cover/first slide
- Output dimensions: ${format === "portrait" ? "1080x1350px (4:5)" : format === "story" || format === "reel-cover" ? "1080x1920px (9:16)" : "1080x1080px (1:1 square)"}
- If text overlay: describe placement, size, and style
- Be specific: "A [style] [type of image] featuring [subject]. [Composition details]. Colors: [Hex codes]. [Mood]. Instagram-ready, high quality."
- Do NOT use generic phrases. Be concrete and visual.

Return ONLY valid JSON, no markdown.`;

  let lastError: unknown = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
        safetySettings: [...DEFAULT_SAFETY],
      });
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = safeGetText(response);

      if (text) {
        const cleanedText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        const match = cleanedText.match(/\{[\s\S]*\}/);
        const jsonStr = match ? match[0] : cleanedText;
        const post = JSON.parse(jsonStr);
        return {
          caption: post.caption || { hook: "", body: "", cta: "", hashtags: [] },
          visualDescription: post.visualDescription || post.nanoBananaPrompt || "",
          nanoBananaPrompt: post.nanoBananaPrompt || post.visualDescription,
        };
      }
      lastError = new Error("Empty or blocked response");
    } catch (err) {
      console.warn(`[generatePost] Model ${modelName} failed:`, err);
      lastError = err;
    }
  }
  const msg = lastError instanceof Error ? lastError.message : "Unknown error";
  throw new Error(`Failed to generate post: ${msg}`);
}
