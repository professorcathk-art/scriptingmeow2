import Stripe from "stripe";

export const stripe =
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_")
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || process.env.STRIPE_PRICE_BASIC || "",
  creator: process.env.STRIPE_PRICE_CREATOR || process.env.STRIPE_PRICE_PRO || "",
} as const;
