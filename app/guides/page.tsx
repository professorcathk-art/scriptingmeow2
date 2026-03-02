import Link from "next/link";

export default function GuidesPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold text-white mb-6">Guides</h1>
        <p className="text-zinc-400 mb-8">
          Coming soon. In the meantime, get started by creating a Brand Space and generating your first post.
        </p>
        <Link
          href="/auth/signup"
          className="inline-block px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90"
        >
          Get started
        </Link>
      </div>
    </main>
  );
}
