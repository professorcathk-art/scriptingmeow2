/**
 * Gemini Nano Banana image generation.
 * Uses Nano Banana Pro (Gemini 3 Pro Image) for best quality and Chinese text.
 * Falls back to gemini-2.5-flash-image if Pro fails.
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

const MODEL_PRO = "gemini-3-pro-image-preview";
const MODEL_FLASH = "gemini-2.5-flash-image";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GenerateImageOptions {
  /** Aspect ratio: "1:1", "4:5", "9:16", etc. Default 1:1 for square. */
  aspectRatio?: string;
  /** Style reference URLs—colors, composition, mood. Used for visual guidance only. */
  styleReferenceUrls?: string[];
  /** Important asset URLs—images that MUST appear in the output (portraits, products, etc.). */
  importantAssetUrls?: string[];
  /** @deprecated Use styleReferenceUrls + importantAssetUrls */
  referenceImageUrls?: string[];
}

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

async function generateWithModel(
  model: string,
  prompt: string,
  aspectRatio: string,
  apiKey: string,
  styleRefUrls: string[] = [],
  importantUrls: string[] = []
): Promise<Buffer | null> {
  const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  const allUrls = [...styleRefUrls, ...importantUrls].slice(0, 5);
  for (let i = 0; i < allUrls.length; i++) {
    const part = await fetchImagePart(allUrls[i]);
    if (part) parts.push(part);
  }

  let instruction = "";
  if (styleRefUrls.length > 0 || importantUrls.length > 0) {
    const instrParts: string[] = [
      "Reference images and brandbook are for inspiration only. Priority is a harmonious, professional design that looks good.",
    ];
    if (styleRefUrls.length > 0) {
      instrParts.push(`Style references (first ${styleRefUrls.length}): Use for composition, mood, and aesthetic. Derive a cohesive palette—if colors clash, choose harmony over literal matching.`);
    }
    if (importantUrls.length > 0) {
      instrParts.push(`Important assets (last ${importantUrls.length}): These MUST appear in the output (portraits, products, logos). Incorporate them; adjust surrounding colors for visual harmony.`);
    }
    instruction = `${instrParts.join(" ")}\n\n`;
  }
  parts.push({ text: instruction + prompt });

  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[nano-banana] ${model} API error:`, res.status, errText);
    return null;
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ inlineData?: { data?: string } }>;
      };
    }>;
  };

  const responseParts = data.candidates?.[0]?.content?.parts ?? [];
  for (const part of responseParts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }
  return null;
}

/**
 * Generates an image using Gemini's Nano Banana. Tries Pro model first for better
 * Chinese text rendering, then falls back to Flash.
 */
export async function generateImageWithNanoBanana(
  prompt: string,
  options: GenerateImageOptions = {}
): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[nano-banana] GEMINI_API_KEY not set");
    return null;
  }

  const aspectRatio = options.aspectRatio ?? "1:1";
  const styleRefUrls = options.styleReferenceUrls ?? options.referenceImageUrls ?? [];
  const importantUrls = options.importantAssetUrls ?? [];

  const buffer = await generateWithModel(MODEL_PRO, prompt, aspectRatio, apiKey, styleRefUrls, importantUrls);
  if (buffer) return buffer;

  const fallback = await generateWithModel(MODEL_FLASH, prompt, aspectRatio, apiKey, styleRefUrls, importantUrls);
  if (fallback) return fallback;

  console.warn("[nano-banana] Both models failed");
  return null;
}
