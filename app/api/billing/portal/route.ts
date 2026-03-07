import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

/**
 * POST /api/billing/portal
 * Creates a Stripe Customer Portal session for managing subscription, payment methods, invoices.
 */
export async function POST() {
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

    const { data: userProfile } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    const customerId = userProfile?.stripe_customer_id;
    if (!customerId) {
      return NextResponse.json(
        { error: "No billing account. Subscribe first to manage billing." },
        { status: 400 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const returnUrl = `${baseUrl}/billing`;
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const err = error as { type?: string; code?: string; message?: string };
    console.error("Billing portal error:", err?.message ?? error);
    const message =
      err?.type === "StripeInvalidRequestError"
        ? err?.message ?? "Stripe request failed"
        : "Failed to create portal session";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
