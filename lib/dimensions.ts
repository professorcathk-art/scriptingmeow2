/**
 * Dimension utilities for design playground.
 * Gemini API supports predefined aspect ratios only.
 * User can enter width x height in px or mm; we map to closest ratio.
 */

export const MAX_DIMENSION_PX = 2000;
export const MM_TO_PX = 3.7795275591; // 96 DPI

const SUPPORTED_RATIOS = [
  "21:9",
  "16:9",
  "4:3",
  "3:2",
  "1:1",
  "9:16",
  "3:4",
  "2:3",
  "5:4",
  "4:5",
] as const;

function ratioToDecimal(ratio: string): number {
  const [w, h] = ratio.split(":").map(Number);
  return w / h;
}

/** Clamp value to max dimension. */
export function clampDimension(value: number): number {
  return Math.min(Math.max(1, Math.round(value)), MAX_DIMENSION_PX);
}

/** Parse user input: "1080" or "1080x1920" or "100mm" */
export function parseDimensionInput(
  input: string,
  unit: "px" | "mm"
): { width: number; height: number } | null {
  const s = input.trim().replace(/\s+/g, " ");
  const num = (v: string) => {
    const n = parseFloat(v.replace(/[^\d.]/g, ""));
    if (isNaN(n)) return null;
    return unit === "mm" ? Math.round(n * MM_TO_PX) : Math.round(n);
  };

  if (s.includes("x") || s.includes("×")) {
    const [a, b] = s.split(/[x×]/).map((x) => x.trim());
    const w = num(a);
    const h = num(b);
    if (w != null && h != null && w > 0 && h > 0) {
      return {
        width: clampDimension(w),
        height: clampDimension(h),
      };
    }
  }

  const single = num(s);
  if (single != null && single > 0) {
    const clamped = clampDimension(single);
    return { width: clamped, height: clamped };
  }
  return null;
}

/** Convert width x height to closest Gemini aspect ratio. */
export function dimensionsToAspectRatio(width: number, height: number): string {
  const decimal = width / height;
  let closest = "1:1";
  let minDiff = Infinity;

  for (const ratio of SUPPORTED_RATIOS) {
    const r = ratioToDecimal(ratio);
    const diff = Math.abs(decimal - r);
    if (diff < minDiff) {
      minDiff = diff;
      closest = ratio;
    }
  }
  return closest;
}

/** Preset dimensions for quick select. */
export const DIMENSION_PRESETS: { value: string; label: string; width?: number; height?: number }[] = [
  { value: "1:1", label: "Square (1:1)", width: 1080, height: 1080 },
  { value: "4:5", label: "Portrait (4:5)", width: 1080, height: 1350 },
  { value: "9:16", label: "Story (9:16)", width: 1080, height: 1920 },
  { value: "16:9", label: "Landscape (16:9)", width: 1920, height: 1080 },
  { value: "3:4", label: "Poster (3:4)", width: 1080, height: 1440 },
  { value: "custom", label: "Custom (mm or px)" },
];
