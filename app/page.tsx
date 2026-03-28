import Script from "next/script";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingLogoCloud } from "@/components/landing/landing-logo-cloud";
import { LandingDemoSection } from "@/components/landing/landing-demo-section";
import { LandingHowItWorks } from "@/components/landing/landing-how-it-works";
import { LandingTestimonials } from "@/components/landing/landing-testimonials";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFooter } from "@/components/landing/landing-footer";
import { faqPageJsonLdDocument, jsonLdScriptContent } from "@/lib/seo/landing-jsonld";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "designermeow — AI Instagram Post Generator",
  description:
    "designermeow.com: AI Instagram post generator for creators and brands. Define Brand DNA, prompt the AI studio, generate square/portrait/story/carousel posts with Nano Banana. FAQs, pricing, and free tier on site.",
  openGraph: {
    title: "designermeow — AI Instagram Post Generator",
    description:
      "Web app to create on-brand Instagram posts and carousels: Brand Space, brandbook, prompts, library. designermeow.com.",
    url: "https://designermeow.com",
  },
  twitter: {
    title: "designermeow — AI Instagram Post Generator",
    description:
      "AI-powered Instagram design: brandbook, single & carousel posts, style gallery. designermeow.com.",
  },
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let publicDesigns: { id: string; image_url: string; content_idea?: string }[] = [];
  let publicDesignCount = 0;
  try {
    const admin = createAdminClient();
    const { count } = await admin
      .from("generated_posts")
      .select("id", { count: "exact", head: true })
      .eq("is_public_gallery", true)
      .eq("status", "saved");
    publicDesignCount = count ?? 0;
    const { data } = await admin
      .from("generated_posts")
      .select("id, visual_url, carousel_urls, content_idea")
      .eq("is_public_gallery", true)
      .eq("status", "saved")
      .order("created_at", { ascending: false })
      .limit(9);
    publicDesigns = (data ?? []).map((p) => ({
      id: p.id,
      image_url: (p.carousel_urls as string[])?.[0] ?? (p.visual_url as string) ?? "",
      content_idea: p.content_idea as string,
    })).filter((p) => p.image_url).slice(0, 9);
  } catch {
    // Admin client may not be configured
  }

  return (
    <main className="min-h-screen bg-zinc-950 overflow-x-hidden" aria-label="designermeow marketing home">
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScriptContent(faqPageJsonLdDocument) }}
        strategy="afterInteractive"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.15),transparent)] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_0%,rgba(6,182,212,0.08),transparent)] pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_20%_50%,rgba(236,72,153,0.06),transparent)] pointer-events-none"
        aria-hidden
      />
      <div className="relative z-10">
        <LandingHero isAuthenticated={!!user} publicDesigns={publicDesigns} publicDesignCount={publicDesignCount} />
        <LandingLogoCloud />
        <LandingDemoSection />
        <LandingHowItWorks />
        <LandingTestimonials />
        <LandingFaq />
        <LandingFooter />
      </div>
    </main>
  );
}
