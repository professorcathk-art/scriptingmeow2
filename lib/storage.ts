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

/**
 * Uploads a generated PNG image to Supabase Storage and returns the public URL.
 * Falls back to data URL if upload fails.
 * @param pageIndex - Optional 1-based index for carousel pages (e.g. 1 → postId-page-1.png)
 */
export async function uploadPostImage(
  imageBuffer: Buffer,
  postId: string,
  userId: string,
  pageIndex?: number
): Promise<string> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY not set");
    return `data:image/png;base64,${imageBuffer.toString("base64")}`;
  }

  try {
    const supabase = createAdminClient();
    const path =
      pageIndex != null
        ? `${userId}/${postId}-page-${pageIndex}.png`
        : `${userId}/${postId}.png`;

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.warn("Storage upload failed:", error.message);
      return `data:image/png;base64,${imageBuffer.toString("base64")}`;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.warn("Storage upload error:", err);
    return `data:image/png;base64,${imageBuffer.toString("base64")}`;
  }
}

/**
 * Uploads a design playground image to Supabase Storage.
 * Path: design-playground/{userId}/{uuid}.png
 */
export async function uploadDesignPlaygroundImage(
  imageBuffer: Buffer,
  userId: string,
  id: string
): Promise<string> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return `data:image/png;base64,${imageBuffer.toString("base64")}`;
  }
  try {
    const supabase = createAdminClient();
    const path = `design-playground/${userId}/${id}.png`;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, imageBuffer, { contentType: "image/png", upsert: true });
    if (error) {
      console.warn("[design-playground] Upload failed:", error.message);
      return `data:image/png;base64,${imageBuffer.toString("base64")}`;
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.warn("[design-playground] Upload error:", err);
    return `data:image/png;base64,${imageBuffer.toString("base64")}`;
  }
}
