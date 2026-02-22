import { createClient } from "@/lib/supabase/server";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingLogoCloud } from "@/components/landing/landing-logo-cloud";
import { LandingDemoSection } from "@/components/landing/landing-demo-section";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingTestimonials } from "@/components/landing/landing-testimonials";
import { LandingFooter } from "@/components/landing/landing-footer";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="min-h-screen bg-zinc-950 overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.15),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_0%,rgba(6,182,212,0.08),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_20%_50%,rgba(236,72,153,0.06),transparent)] pointer-events-none" />
      <div className="relative z-10">
        <LandingHero isAuthenticated={!!user} />
        <LandingLogoCloud />
        <LandingDemoSection />
        <LandingHowItWorks />
        <LandingTestimonials />
        <LandingFooter />
      </div>
    </main>
  );
}
