"use client";

import { useState } from "react";
import type { PlanTier } from "@/types/database";

type BillingCheckoutButtonProps = {
  plan: Exclude<PlanTier, "free">;
  children: React.ReactNode;
  className?: string;
};

export function BillingCheckoutButton({
  plan,
  children,
  className,
}: BillingCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCheckout}
      disabled={loading}
      className={className}
    >
      {loading ? "Redirecting..." : children}
    </button>
  );
}
