import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBrandbookPrompt } from "@/lib/ai/load-prompts";

export async function GET() {
  const checks: Record<string, string> = {
    database: "unknown",
    gemini: "unknown",
    environment: "unknown",
    stripe: "unknown",
    prompts: "unknown",
  };

  try {
    // Check database connection
    const supabase = await createClient();
    const { error: dbError } = await supabase.from("users").select("count").limit(1);
    checks.database = dbError ? "unhealthy" : "healthy";

    // Check Gemini API
    const geminiKey = process.env.GEMINI_API_KEY;
    checks.gemini = geminiKey && geminiKey.length > 0 ? "healthy" : "unhealthy";

    // Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    checks.environment = supabaseUrl && supabaseKey ? "healthy" : "unhealthy";

    // Check Stripe (sandbox) – checkout + portal + webhook
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    const stripeStarter = process.env.STRIPE_PRICE_STARTER;
    const stripeCreator = process.env.STRIPE_PRICE_CREATOR;
    const stripeWebhook = process.env.STRIPE_WEBHOOK_SECRET;
    const hasStripeKeys =
      stripeKey?.startsWith("sk_") && stripeStarter && stripeCreator && stripeWebhook?.startsWith("whsec_");
    checks.stripe = hasStripeKeys ? "healthy" : stripeKey ? "degraded" : "unhealthy";

    // Check prompts load
    try {
      const testPrompt = getBrandbookPrompt({
        brandName: "Test",
        brandTypeContext: "Personal Brand",
        audiences: "Test",
        painPoints: "Test",
        outcomes: "Test",
        valueProp: "Test",
        refImagesSection: "No reference images",
      });
      checks.prompts = testPrompt && testPrompt.length > 100 ? "healthy" : "degraded";
    } catch {
      checks.prompts = "unhealthy";
    }

    const critical = ["database", "gemini", "environment"];
    const allCritical = critical.every((k) => checks[k] === "healthy");
    const status = allCritical ? "healthy" : "degraded";

    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status,
        checks,
      },
      { status: allCritical ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        status: "unhealthy",
        checks,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}
