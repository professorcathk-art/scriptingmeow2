import Link from "next/link";
import { PLAN_LIMITS, type PlanTier } from "@/types/database";
import { formatCurrency } from "@/lib/utils";

const plans: Array<{
  tier: PlanTier;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
}> = [
  {
    tier: "free",
    name: "Free",
    price: 0,
    features: [
      `${PLAN_LIMITS.free.brand_spaces} Brand Space${PLAN_LIMITS.free.brand_spaces > 1 ? "s" : ""}`,
      `${PLAN_LIMITS.free.monthly_credits} credits/month`,
      "AI post generation",
      "Basic support",
    ],
  },
  {
    tier: "basic",
    name: "Basic",
    price: 9.9,
    features: [
      `${PLAN_LIMITS.basic.brand_spaces} Brand Spaces`,
      `${PLAN_LIMITS.basic.monthly_credits} credits/month`,
      "AI post generation",
      "Priority support",
      "Export options",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    price: 19.99,
    features: [
      `${PLAN_LIMITS.pro.brand_spaces} Brand Spaces`,
      `${PLAN_LIMITS.pro.monthly_credits} credits/month`,
      "AI post generation",
      "Priority support",
      "Batch generation",
      "Advanced analytics",
      "Custom branding",
    ],
    popular: true,
  },
];

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold text-white mb-4">Pricing</h1>
        <p className="text-zinc-400 mb-12">
          Simple, transparent pricing. Start free, upgrade when you need more.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.tier}
              className={`relative p-6 rounded-2xl border ${
                plan.popular
                  ? "bg-zinc-900/50 border-violet-500/50"
                  : "bg-zinc-900/50 border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 text-xs font-semibold text-white">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">{plan.name}</h3>
              <div className="mb-6">
                <span className="text-3xl font-bold text-zinc-100">{formatCurrency(plan.price)}</span>
                <span className="text-zinc-400">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-400">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className={`block w-full py-2.5 rounded-xl text-center font-medium transition-opacity ${
                  plan.popular
                    ? "gradient-ai text-white hover:opacity-90"
                    : "bg-white/10 text-zinc-100 hover:bg-white/15"
                }`}
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
