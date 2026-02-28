import { stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CREDITS_BY_TIER: Record<string, number> = {
  free: 5,
  basic: 50,
  pro: 200,
};

function priceIdToTier(priceId: string): string {
  if (priceId === STRIPE_PRICE_IDS.basic) return "basic";
  if (priceId === STRIPE_PRICE_IDS.pro) return "pro";
  return "basic";
}

export async function POST(request: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 503 }
    );
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    const headersList = await headers();
    const sig = headersList.get("stripe-signature");
    if (!sig) {
      return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
    }
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const planTier = session.metadata?.plan_tier as string;
        if (!userId || !planTier) {
          console.error("Missing metadata in checkout.session.completed");
          break;
        }
        const credits = CREDITS_BY_TIER[planTier] ?? 5;
        const priceId = STRIPE_PRICE_IDS[planTier as keyof typeof STRIPE_PRICE_IDS] || null;
        await supabaseAdmin
          .from("users")
          .update({
            plan_tier: planTier,
            credits_remaining: credits,
            credits_reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            stripe_price_id: priceId || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;
        let planTier = "free";
        if (event.type === "customer.subscription.updated" && sub.items?.data?.[0]?.price?.id) {
          planTier = priceIdToTier(sub.items.data[0].price.id);
        }
        const credits = CREDITS_BY_TIER[planTier] ?? 5;
        await supabaseAdmin
          .from("users")
          .update({
            plan_tier: planTier,
            credits_remaining: credits,
            stripe_subscription_id:
              event.type === "customer.subscription.deleted" ? null : sub.id,
            stripe_price_id:
              event.type === "customer.subscription.deleted"
                ? null
                : sub.items?.data?.[0]?.price?.id ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
