import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    checks: {
      database: "unknown",
      gemini: "unknown",
      environment: "unknown",
    },
  };

  try {
    // Check database connection
    const supabase = await createClient();
    const { error: dbError } = await supabase.from("users").select("count").limit(1);
    checks.checks.database = dbError ? "unhealthy" : "healthy";

    // Check Gemini API
    const geminiKey = process.env.GEMINI_API_KEY;
    checks.checks.gemini = geminiKey && geminiKey.length > 0 ? "healthy" : "unhealthy";

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    checks.checks.environment =
      supabaseUrl && supabaseKey ? "healthy" : "unhealthy";

    // Overall status
    const allHealthy = Object.values(checks.checks).every((status) => status === "healthy");
    checks.status = allHealthy ? "healthy" : "degraded";

    return NextResponse.json(checks, {
      status: allHealthy ? 200 : 503,
    });
  } catch (error) {
    checks.status = "unhealthy";
    return NextResponse.json(checks, { status: 503 });
  }
}
