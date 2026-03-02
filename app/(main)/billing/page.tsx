import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLAN_LIMITS, type PlanTier } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { BillingCheckoutButton } from "@/components/billing/billing-checkout-button";
import { SignOutButton } from "./sign-out-button";

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!userProfile) {
    redirect("/dashboard");
  }

  const plans: Array<{
    tier: PlanTier;
    name: string;
    price: number;
    limits: typeof PLAN_LIMITS[PlanTier];
    features: string[];
    popular?: boolean;
  }> = [
    {
      tier: "free",
      name: "Free",
      price: 0,
      limits: PLAN_LIMITS.free,
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
      limits: PLAN_LIMITS.basic,
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
      limits: PLAN_LIMITS.pro,
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-2">
            Billing & Account
          </h1>
          <p className="text-zinc-400 text-sm sm:text-base">
            Manage your subscription and credits
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="mailto:chris.lau@professor-cat.com"
            className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
          >
            Support
          </a>
          <SignOutButton />
        </div>
      </div>

      <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Current Plan
        </h2>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-lg font-medium text-zinc-100">
              {userProfile.plan_tier === "free"
                ? "Free Plan"
                : userProfile.plan_tier === "basic"
                ? "Basic Plan"
                : "Pro Plan"}
            </p>
            <p className="text-sm text-zinc-400">
              {userProfile.credits_remaining} credits remaining
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Credits reset on{" "}
              {new Date(userProfile.credits_reset_date).toLocaleDateString()}
            </p>
          </div>
          {userProfile.plan_tier !== "pro" && (
            <BillingCheckoutButton
              plan={userProfile.plan_tier === "free" ? "basic" : "pro"}
              className="px-4 py-2 rounded-xl gradient-ai text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
            >
              Upgrade
            </BillingCheckoutButton>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-zinc-100 mb-6">
          Available Plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.tier === userProfile.plan_tier;
            const tierOrder = { free: 0, basic: 1, pro: 2 };
            const isUpgrade =
              !isCurrentPlan &&
              tierOrder[plan.tier as keyof typeof tierOrder] > tierOrder[userProfile.plan_tier as keyof typeof tierOrder];

            return (
              <div
                key={plan.tier}
                className={`relative p-6 rounded-2xl border ${
                  plan.popular
                    ? "bg-zinc-900/50 border-violet-500/50 shadow-[0_0_40px_-10px_rgba(139,92,246,0.3)]"
                    : "bg-zinc-900/50 border-white/10"
                } ${isCurrentPlan ? "ring-2 ring-violet-500/50" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 text-xs font-semibold text-white">
                    Most Popular
                  </div>
                )}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-zinc-100">
                    {plan.name}
                  </h3>
                  {isCurrentPlan && (
                    <span className="text-sm text-violet-400 font-medium">
                      Current
                    </span>
                  )}
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-zinc-100">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-zinc-400">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-zinc-400"
                    >
                      <CheckIcon />
                      {feature}
                    </li>
                  ))}
                </ul>
                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-zinc-500 cursor-not-allowed font-medium"
                  >
                    Current Plan
                  </button>
                ) : isUpgrade ? (
                  <BillingCheckoutButton
                    plan={plan.tier as "basic" | "pro"}
                    className="block w-full px-4 py-2.5 rounded-xl gradient-ai text-white font-medium text-center hover:opacity-90 transition-opacity disabled:opacity-70"
                  >
                    Upgrade
                  </BillingCheckoutButton>
                ) : (
                  <button
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 text-zinc-500 cursor-not-allowed font-medium"
                  >
                    Downgrade
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-zinc-900/50 rounded-2xl border border-white/10 p-6">
        <h2 className="text-xl font-semibold text-zinc-100 mb-4">
          Credit System
        </h2>
        <div className="space-y-2 text-sm text-zinc-400">
          <p>
            <strong className="text-zinc-300">
              1 credit = 1 generated variation for one size
            </strong>
          </p>
          <p>
            Credits reset monthly on your billing date. Unused credits do not
            roll over.
          </p>
          <p>
            Example: Generating 3 variations of a square post uses 3 credits.
          </p>
        </div>
      </div>
    </div>
  );
}
