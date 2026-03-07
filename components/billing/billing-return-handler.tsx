"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

/**
 * When returning from Stripe (success/canceled), refresh the auth session
 * to avoid "login again" issues caused by cookie/session state.
 */
export function BillingReturnHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (success !== "true" && canceled !== "true") return;

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.getSession().then(() => {
      router.replace("/billing", { scroll: false });
      router.refresh();
    });
  }, [success, canceled, router]);

  return null;
}
