import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "post-images";

/**
 * Creates an SVG placeholder image for post preview.
 * Used when no actual image generation is available.
 */
function createPlaceholderSvg(description: string, size = 1080): string {
  const text = description.length > 60 ? description.substring(0, 57) + "..." : description;
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="#4F46E5"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="24" font-weight="500" padding="40">${escaped}</text>
</svg>`;
}

/**
 * Uploads a placeholder image to Supabase Storage and returns the public URL.
 * Uses admin client (service role) to bypass RLS. Falls back to data URL if upload fails.
 */
export async function uploadPostPlaceholder(
  visualDescription: string,
  postId: string,
  userId: string
): Promise<string> {
  const svg = createPlaceholderSvg(visualDescription);
  const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY not set, using data URL");
    return dataUrl;
  }

  try {
    const supabase = createAdminClient();
    const buffer = Buffer.from(svg, "utf-8");
    const path = `${userId}/${postId}.svg`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: "image/svg+xml",
        upsert: true,
      });

    if (error) {
      console.warn("Storage upload failed, using data URL:", error.message);
      return dataUrl;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.warn("Storage upload error, using data URL:", err);
    return dataUrl;
  }
}
