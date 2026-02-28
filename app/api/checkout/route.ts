import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";
import type { PlanTier } from "@/types/database";
import type Stripe from "stripe";

export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured" },
        { status: 503 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = (await request.json()) as { plan?: string };
    const tier = (plan === "basic" || plan === "pro" ? plan : "basic") as Exclude<PlanTier, "free">;

    const priceId = STRIPE_PRICE_IDS[tier];
    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price not configured for ${tier}` },
        { status: 503 }
      );
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/billing?success=true`,
      cancel_url: `${baseUrl}/billing?canceled=true`,
      metadata: { user_id: user.id, plan_tier: tier },
      subscription_data: { metadata: { user_id: user.id, plan_tier: tier } },
    };

    if (userProfile?.stripe_customer_id) {
      sessionParams.customer = userProfile.stripe_customer_id;
      delete sessionParams.customer_email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
