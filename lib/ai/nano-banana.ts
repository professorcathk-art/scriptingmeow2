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
  /** Up to 3 reference image URLs for style guidance. */
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
  referenceImageUrls: string[] = []
): Promise<Buffer | null> {
  const url = `${API_BASE}/models/${model}:generateContent?key=${apiKey}`;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  for (let i = 0; i < Math.min(referenceImageUrls.length, 3); i++) {
    const part = await fetchImagePart(referenceImageUrls[i]);
    if (part) parts.push(part);
  }

  const styleInstruction =
    parts.length > 0
      ? "Reference images: These can be style references, logos, or real assets to include in the image. Use them as the user intends—logos exactly as provided, assets to incorporate, or style/color guidance. Generate an image matching the prompt below.\n\n"
      : "";
  parts.push({ text: styleInstruction + prompt });

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
  const referenceImageUrls = options.referenceImageUrls ?? [];

  const buffer = await generateWithModel(MODEL_PRO, prompt, aspectRatio, apiKey, referenceImageUrls);
  if (buffer) return buffer;

  const fallback = await generateWithModel(MODEL_FLASH, prompt, aspectRatio, apiKey, referenceImageUrls);
  if (fallback) return fallback;

  console.warn("[nano-banana] Both models failed");
  return null;
}
