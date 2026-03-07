import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * POST /api/billing/upgrade
 * For existing subscribers: upgrades/downgrades with Stripe proration (補差價).
 * Uses subscription update instead of new Checkout to get fair prorated billing.
 */
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
    const tier = (plan === "basic" || plan === "pro" ? plan : "basic") as "basic" | "pro";
    const newPriceId = STRIPE_PRICE_IDS[tier];

    if (!newPriceId) {
      return NextResponse.json(
        { error: `Stripe price not configured for ${tier}` },
        { status: 503 }
      );
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("stripe_customer_id, stripe_subscription_id, stripe_price_id")
      .eq("id", user.id)
      .single();

    if (!userProfile?.stripe_subscription_id || !userProfile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription. Use Upgrade for new subscriptions." },
        { status: 400 }
      );
    }

    if (userProfile.stripe_price_id === newPriceId) {
      return NextResponse.json(
        { error: "Already on this plan" },
        { status: 400 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(
      userProfile.stripe_subscription_id
    );

    const itemId = subscription.items.data[0]?.id;
    if (!itemId) {
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 }
      );
    }

    await stripe.subscriptions.update(userProfile.stripe_subscription_id, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "always_invoice",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Upgrade error:", error);
    return NextResponse.json(
      { error: "Failed to upgrade plan" },
      { status: 500 }
    );
  }
}
