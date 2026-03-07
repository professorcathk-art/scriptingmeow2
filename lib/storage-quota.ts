/**
 * Storage quota calculation for user library.
 * Sums file sizes from post-images and brand-reference-images buckets.
 * Complexity: O(files) - one list call per folder level. Typically 1–3 levels per user.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanTier } from "@/types/database";
import { PLAN_LIMITS } from "@/types/database";

const BUCKET = "post-images";
const BRAND_BUCKET = "brand-reference-images";

async function listRecursive(
  supabase: ReturnType<typeof createAdminClient>,
  bucket: string,
  path: string
): Promise<number> {
  let total = 0;
  const { data, error } = await supabase.storage.from(bucket).list(path, { limit: 1000 });

  if (error) {
    console.warn(`[storage-quota] list ${bucket}/${path} failed:`, error.message);
    return 0;
  }

  for (const item of data ?? []) {
    if (item.id === null) {
      total += await listRecursive(supabase, bucket, path ? `${path}/${item.name}` : item.name);
    } else {
      total += (item as { size?: number }).size ?? 0;
    }
  }
  return total;
}

/**
 * Get total storage usage in bytes for a user.
 * Scans: post-images/{userId}, post-images/design-playground/{userId}, brand-reference-images/{userId}.
 */
export async function getStorageUsageBytes(userId: string): Promise<number> {
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : null;
  if (!supabase) return 0;

  const postTotal = await listRecursive(supabase, BUCKET, userId);
  const designTotal = await listRecursive(supabase, BUCKET, `design-playground/${userId}`);
  const brandTotal = await listRecursive(supabase, BRAND_BUCKET, userId);

  return postTotal + designTotal + brandTotal;
}

export function bytesToMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 100) / 100;
}

export function getStorageLimitBytes(planTier: PlanTier): number {
  return (PLAN_LIMITS[planTier].storage_mb ?? 20) * 1024 * 1024;
}

export async function canUpload(
  userId: string,
  planTier: PlanTier,
  additionalBytes: number
): Promise<{ allowed: boolean; usageBytes: number; limitBytes: number }> {
  const usageBytes = await getStorageUsageBytes(userId);
  const limitBytes = getStorageLimitBytes(planTier);
  const allowed = usageBytes + additionalBytes <= limitBytes;
  return { allowed, usageBytes, limitBytes };
}
