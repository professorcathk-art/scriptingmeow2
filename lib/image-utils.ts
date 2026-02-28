/** Max size before compression (2MB). Vercel limit is 4.5MB per request. */
const COMPRESS_THRESHOLD = 2 * 1024 * 1024;
const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

/**
 * Compress image if over threshold. Returns original file if small enough or not an image.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (file.size <= COMPRESS_THRESHOLD) return file;
  if (!file.type.startsWith("image/")) return file;

  try {
    const img = await createImageBitmap(file);
    const { width, height } = img;
    if (width <= MAX_DIMENSION && height <= MAX_DIMENSION && file.size <= COMPRESS_THRESHOLD * 1.5) {
      img.close();
      return file;
    }

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    const w = Math.round(width * scale);
    const h = Math.round(height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      img.close();
      return file;
    }
    ctx.drawImage(img, 0, 0, w, h);
    img.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
