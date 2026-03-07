import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getStorageUsageBytes, bytesToMB, getStorageLimitBytes } from "@/lib/storage-quota";
import { PLAN_LIMITS, type PlanTier } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * GET /api/storage/usage - Get current user's storage usage
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("plan_tier")
      .eq("id", user.id)
      .single();

    const planTier = (profile?.plan_tier ?? "free") as PlanTier;
    const usageBytes = await getStorageUsageBytes(user.id);
    const limitBytes = getStorageLimitBytes(planTier);
    const limitMB = PLAN_LIMITS[planTier].storage_mb ?? 20;

    return NextResponse.json({
      usageBytes,
      limitBytes,
      usageMB: bytesToMB(usageBytes),
      limitMB,
      percentUsed: limitBytes > 0 ? Math.round((usageBytes / limitBytes) * 100) : 0,
    });
  } catch (error) {
    console.error("[storage/usage]", error);
    return NextResponse.json({ error: "Failed to get storage usage" }, { status: 500 });
  }
}
