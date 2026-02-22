import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PLAN_LIMITS, type PlanTier } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

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
  }> = [
    {
      tier: "free",
      name: "Free",
      price: 0,
      limits: PLAN_LIMITS.free,
    },
    {
      tier: "basic",
      name: "Basic",
      price: 9.9,
      limits: PLAN_LIMITS.basic,
    },
    {
      tier: "pro",
      name: "Pro",
      price: 19.99,
      limits: PLAN_LIMITS.pro,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Billing & Account</h1>
        <p className="text-gray-600">
          Manage your subscription and credits
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Current Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-medium">
              {userProfile.plan_tier === "free"
                ? "Free Plan"
                : userProfile.plan_tier === "basic"
                ? "Basic Plan"
                : "Pro Plan"}
            </p>
            <p className="text-sm text-gray-600">
              {userProfile.credits_remaining} credits remaining
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Credits reset on {new Date(userProfile.credits_reset_date).toLocaleDateString()}
            </p>
          </div>
          {userProfile.plan_tier !== "pro" && (
            <Link
              href="/billing/upgrade"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upgrade
            </Link>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = plan.tier === userProfile.plan_tier;
            const isUpgrade =
              (userProfile.plan_tier === "free" && plan.tier === "basic") ||
              (userProfile.plan_tier === "basic" && plan.tier === "pro");

            return (
              <div
                key={plan.tier}
                className={`p-6 rounded-lg border-2 ${
                  isCurrentPlan
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  {isCurrentPlan && (
                    <span className="text-sm text-blue-600 font-medium">Current</span>
                  )}
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold">
                    {formatCurrency(plan.price)}
                  </span>
                  <span className="text-gray-600">/month</span>
                </div>
                <ul className="space-y-2 mb-6">
                  <li className="text-sm">
                    {plan.limits.brand_spaces} Brand Space
                    {plan.limits.brand_spaces > 1 ? "s" : ""}
                  </li>
                  <li className="text-sm">
                    {plan.limits.monthly_credits} credits/month
                  </li>
                  {plan.limits.priority_support && (
                    <li className="text-sm">Priority support</li>
                  )}
                  {plan.limits.batch_generation && (
                    <li className="text-sm">Batch generation</li>
                  )}
                </ul>
                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded-lg cursor-not-allowed"
                  >
                    Current Plan
                  </button>
                ) : isUpgrade ? (
                  <Link
                    href={`/billing/upgrade?plan=${plan.tier}`}
                    className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center"
                  >
                    Upgrade
                  </Link>
                ) : (
                  <button
                    disabled
                    className="w-full px-4 py-2 bg-gray-200 text-gray-600 rounded-lg cursor-not-allowed"
                  >
                    Downgrade
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Credit System</h2>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>1 credit = 1 generated variation for one size</strong>
          </p>
          <p>
            Credits reset monthly on your billing date. Unused credits do not roll over.
          </p>
          <p>
            Example: Generating 3 variations of a square post uses 3 credits.
          </p>
        </div>
      </div>
    </div>
  );
}
