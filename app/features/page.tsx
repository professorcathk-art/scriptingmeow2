import { PublicPageLayout } from "@/components/landing/public-page-layout";
import Link from "next/link";

const FEATURES = [
  {
    title: "Brand Spaces",
    description: "Define multiple brands with name, type, and visual direction. Each Brand Space has its own brandbook and generated content.",
  },
  {
    title: "AI Brandbook",
    description: "AI generates a consistent brandbook from your description and reference images. Colors, typography, tone of voice, and visual style—all in one place.",
  },
  {
    title: "Post Generation",
    description: "Create single-image or carousel posts. Choose from square (1:1), portrait (4:5), story (9:16), or reel cover. Generate drafts, review, then produce the final image.",
  },
  {
    title: "Style Gallery",
    description: "Steal winning aesthetics from our curated gallery. Pick a style, enter your content idea, and get a post in that look—customized to your message.",
  },
  {
    title: "Reference Materials",
    description: "Upload images, PDFs, or docs to guide AI generation. Reference images help the AI understand your visual style and brand identity.",
  },
  {
    title: "Logo Integration",
    description: "Upload your logo in the brandbook and choose placement (top, bottom, corners). Your logo is applied automatically to all new posts.",
  },
  {
    title: "Library",
    description: "Save and manage your generated posts. Revisit, download, or regenerate from your library.",
  },
  {
    title: "Credits & Plans",
    description: "Free tier includes 5 credits/month. Upgrade to Basic or Pro for more credits, batch generation, and priority support.",
  },
];

function CheckIcon() {
  return (
    <svg className="w-5 h-5 text-violet-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function FeaturesPage() {
  return (
    <PublicPageLayout>
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold text-white mb-2">Features</h1>
        <p className="text-zinc-400 mb-12">
          Everything you need to create consistent, on-brand Instagram content.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl bg-zinc-900/50 border border-white/10"
            >
              <div className="flex items-start gap-3">
                <CheckIcon />
                <div>
                  <h3 className="font-semibold text-zinc-100 mb-1">{f.title}</h3>
                  <p className="text-zinc-400 text-sm">{f.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/auth/signup"
            className="inline-block px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90"
          >
            Get started free
          </Link>
        </div>
      </div>
    </PublicPageLayout>
  );
}
