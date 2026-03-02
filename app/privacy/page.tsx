import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm mb-8 inline-block">
          ← Back to home
        </Link>
        <h1 className="text-3xl font-bold text-white mb-6">Privacy Policy</h1>
        <p className="text-zinc-400 text-sm">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <div className="mt-8 text-zinc-400 space-y-4">
          <p className="text-zinc-300 font-medium">Placeholder</p>
          <p>
            Please add your Privacy Policy content here. This is a placeholder page.
            Contact your legal team to draft the full policy.
          </p>
        </div>
      </div>
    </main>
  );
}
