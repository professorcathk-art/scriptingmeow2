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
    mood: string;
    imageStyle: string;
    layoutTendencies: string;
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

  const prompt = `You are a brand strategist creating a comprehensive brandbook for an Instagram-focused brand.

Brand Information:
- Name: ${brandData.name}
- Type: ${brandData.type}
- Target Audiences: ${audiences}
- Audience Pain Points: ${painPoints}
- Desired Outcomes: ${outcomes}
- Value Proposition: ${valueProp}

${
  brandData.referenceImages && brandData.referenceImages.length > 0
    ? `Reference Images: The brand has uploaded ${brandData.referenceImages.length} reference images that should inform the visual style.`
    : ""
}

Create a comprehensive brandbook in JSON format with the following structure:
{
  "brandPersonality": "A 2-3 sentence description of the brand's personality",
  "toneOfVoice": "A 2-3 sentence description of how the brand communicates",
  "visualStyle": {
    "colors": ["array of 3-5 primary brand colors"],
    "mood": "The overall mood/feeling of visuals",
    "imageStyle": "Description of image style (e.g., minimalist, vibrant, professional, casual)",
    "layoutTendencies": "Common layout patterns and composition preferences"
  },
  "captionStructure": {
    "hookPatterns": ["array of 3-5 hook patterns/styles"],
    "bodyPatterns": ["array of 3-5 body content patterns"],
    "ctaPatterns": ["array of 3-5 call-to-action patterns"],
    "hashtagStyle": "Description of hashtag strategy and style"
  },
  "dosAndDonts": {
    "dos": ["array of 5-7 things the brand should do"],
    "donts": ["array of 5-7 things the brand should avoid"]
  }
}

Return ONLY valid JSON, no markdown formatting or additional text.`;

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
        return {
          brandPersonality: brandbook.brandPersonality || "",
          toneOfVoice: brandbook.toneOfVoice || "",
          visualStyle: {
            colors: Array.isArray(brandbook.visualStyle?.colors) ? brandbook.visualStyle.colors : [],
            mood: brandbook.visualStyle?.mood || "",
            imageStyle: brandbook.visualStyle?.imageStyle || "",
            layoutTendencies: brandbook.visualStyle?.layoutTendencies || "",
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
  imageUrl?: string;
}> {
  const prompt = `You are creating an Instagram post for a brand following their brandbook.

Brandbook:
- Personality: ${brandbook.brandPersonality}
- Tone of Voice: ${brandbook.toneOfVoice}
- Visual Style: ${JSON.stringify(brandbook.visualStyle)}
- Caption Structure: ${JSON.stringify(brandbook.captionStructure)}
- Do's and Don'ts: ${JSON.stringify(brandbook.dosAndDonts)}

Post Requirements:
- Content Idea: ${contentIdea}
- Language: ${language}
- Post Type: ${postType}
- Format: ${format}

Generate a complete Instagram post in JSON format:
{
  "caption": {
    "hook": "An engaging hook (first 1-2 lines)",
    "body": "The main body content (3-5 sentences)",
    "cta": "A clear call-to-action",
    "hashtags": ["array of 5-10 relevant hashtags"]
  },
  "visualDescription": "A detailed description of what the visual should look like, including colors, composition, text overlay if any, and style"
}

Return ONLY valid JSON, no markdown formatting or additional text.`;

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
        return post;
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
