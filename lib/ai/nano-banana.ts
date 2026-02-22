/**
 * Gemini Nano Banana (gemini-2.5-flash-image) image generation.
 * Uses the Gemini API for native text-to-image generation.
 * @see https://ai.google.dev/gemini-api/docs/image-generation
 */

const MODEL = "gemini-2.5-flash-image";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface GenerateImageOptions {
  /** Aspect ratio: "1:1", "4:5", "9:16", etc. Default 1:1 for square. */
  aspectRatio?: string;
}

/**
 * Generates an image using Gemini's Nano Banana (gemini-2.5-flash-image).
 * Returns PNG bytes or null if generation fails.
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
  const url = `${API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`;

  const body: Record<string, unknown> = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio,
      },
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[nano-banana] API error:", res.status, errText);
      return null;
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            text?: string;
            inlineData?: { mimeType?: string; data?: string };
          }>;
        };
      }>;
    };

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const buffer = Buffer.from(part.inlineData.data, "base64");
        return buffer;
      }
    }

    console.warn("[nano-banana] No image in response");
    return null;
  } catch (err) {
    console.error("[nano-banana] Error:", err);
    return null;
  }
}
