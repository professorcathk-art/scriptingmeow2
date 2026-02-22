import { MainNav } from "@/components/navigation/main-nav";
import { CreditDisplay } from "@/components/credits/credit-display";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
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
    <div className="min-h-screen bg-gray-50">
      <MainNav />
      <div className="container mx-auto px-4 py-6">
        {userProfile && (
          <div className="mb-6">
            <CreditDisplay
              planTier={userProfile.plan_tier}
              creditsRemaining={userProfile.credits_remaining}
              creditsResetDate={userProfile.credits_reset_date}
            />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
