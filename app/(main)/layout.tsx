import { DashboardShell } from "@/components/navigation/dashboard-shell";
import { CreditsProvider } from "@/components/credits/credits-provider";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

  return (
    <CreditsProvider
      initialCredits={userProfile?.credits_remaining ?? 0}
      initialResetDate={userProfile?.credits_reset_date ?? new Date().toISOString()}
      initialPlanTier={userProfile?.plan_tier ?? "free"}
    >
      <DashboardShell>{children}</DashboardShell>
    </CreditsProvider>
  );
}
