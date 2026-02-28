import { DashboardSidebar } from "@/components/navigation/dashboard-sidebar";
import { CreditRing } from "@/components/credits/credit-ring";
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
    <div className="min-h-screen bg-zinc-950 flex">
      <DashboardSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="glass border-b border-white/5 sticky top-0 z-10">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold text-white">
                ScriptingMeow
              </h1>
              <p className="text-sm text-zinc-500">
                AI-powered Instagram posts
              </p>
            </div>
            {userProfile && (
              <CreditRing
                planTier={userProfile.plan_tier}
                creditsRemaining={userProfile.credits_remaining}
                creditsResetDate={userProfile.credits_reset_date}
              />
            )}
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
