import { PublicPageLayout } from "@/components/landing/public-page-layout";
import Link from "next/link";

export default function GuidesPage() {
  return (
    <PublicPageLayout>
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Guides</h1>
        <p className="text-zinc-400 mb-12">
          Get the most out of designermeow with these guides.
        </p>

        <div className="space-y-12">
          <section className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">Getting Started</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Create your first Brand Space, generate a brandbook, and produce your first post in under 10 minutes.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-zinc-400 text-sm">
              <li>Sign up and create a Brand Space (name + brand type)</li>
              <li>Upload 3–10 reference images or generate a brandbook with AI</li>
              <li>Go to Create Post, select your brand, and describe your post idea</li>
              <li>Review the draft, then generate the final image</li>
              <li>Download or save to your library</li>
            </ol>
            <Link
              href="/auth/signup"
              className="inline-block mt-4 px-6 py-2 rounded-xl gradient-ai text-white text-sm font-medium hover:opacity-90"
            >
              Get started
            </Link>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">Steal a Style</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Not sure where to start? Pick a style from our gallery on the homepage. Enter your content idea,
              sign up, and we&apos;ll prefill your create-post flow with that aesthetic.
            </p>
            <p className="text-zinc-400 text-sm">
              The AI adapts the sample style to your specific content while keeping the look and feel.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">Brandbook Best Practices</h2>
            <p className="text-zinc-400 text-sm mb-4">
              A strong brandbook leads to more consistent posts. Upload clear reference images that represent
              your desired style. Include your logo in the brandbook and choose where it appears on generated
              posts.
            </p>
            <p className="text-zinc-400 text-sm">
              Edit your brandbook anytime to refine colors, typography, and visual guidelines.
            </p>
          </section>

          <section className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10">
            <h2 className="text-xl font-semibold text-zinc-100 mb-3">Credits & Billing</h2>
            <p className="text-zinc-400 text-sm mb-4">
              1 credit = 1 generated variation for one size. Carousel posts use credits per page. Credits reset
              monthly. Upgrade your plan from the Billing page for more credits and features.
            </p>
            <Link
              href="/pricing"
              className="text-violet-400 hover:text-violet-300 text-sm"
            >
              View pricing →
            </Link>
          </section>
        </div>
      </div>
    </PublicPageLayout>
  );
}
