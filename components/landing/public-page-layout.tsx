import Link from "next/link";
import { LandingFooter } from "./landing-footer";

interface PublicPageLayoutProps {
  children: React.ReactNode;
}

export function PublicPageLayout({ children }: PublicPageLayoutProps) {
  return (
    <main className="min-h-screen bg-zinc-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(139,92,246,0.15),transparent)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_80%_0%,rgba(6,182,212,0.08),transparent)] pointer-events-none" />
      <div className="relative z-10">
        <header className="border-b border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
            <Link href="/" className="text-xl font-bold tracking-tight text-white hover:text-zinc-200 transition-colors">
              designermeow
            </Link>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <Link href="/discover" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Discover
              </Link>
              <Link href="/auth/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm font-medium text-white transition-colors border border-white/10"
              >
                Get started
              </Link>
            </div>
          </div>
        </header>

        <div className="py-12 px-4">{children}</div>

        <LandingFooter />
      </div>
    </main>
  );
}
