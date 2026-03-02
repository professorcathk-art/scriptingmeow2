import Link from "next/link";

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold text-white mb-6">Features</h1>
        <ul className="space-y-4 text-zinc-400">
          <li><strong className="text-zinc-200">Brand Spaces</strong> — Define your brand once with voice, tone, and visual style</li>
          <li><strong className="text-zinc-200">AI Brandbook</strong> — AI generates a consistent brandbook from your description</li>
          <li><strong className="text-zinc-200">Post Generation</strong> — Single-image or carousel posts, multiple formats (square, portrait, story)</li>
          <li><strong className="text-zinc-200">Style Gallery</strong> — Steal winning aesthetics from our curated gallery</li>
          <li><strong className="text-zinc-200">Reference Materials</strong> — Upload images, PDFs, or docs to guide AI generation</li>
          <li><strong className="text-zinc-200">Logo Integration</strong> — Optional logo placement on generated posts</li>
          <li><strong className="text-zinc-200">Library</strong> — Save and manage your generated posts</li>
        </ul>
      </div>
    </main>
  );
}
