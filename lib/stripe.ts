import Stripe from "stripe";

export const stripe =
  process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.startsWith("sk_")
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : null;

export const STRIPE_PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER || "price_1T8WyiA61RbBP8C2qllK2sKC",
  creator: process.env.STRIPE_PRICE_CREATOR || "price_1T8X2nA61RbBP8C2cEe9zGTv",
} as const;
