"use client";

import { useState } from "react";

interface BillingPortalButtonProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Opens Stripe Customer Portal for managing payment methods, invoices, subscription.
 */
export function BillingPortalButton({
  className,
  children = "Manage billing",
}: BillingPortalButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open billing");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to open billing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={className}
    >
      {loading ? "Opening..." : children}
    </button>
  );
}
