import Link from "next/link";

interface BrandbookCtaProps {
  href: string;
  title?: string;
  subtitle?: string;
  compact?: boolean;
}

export function BrandbookCta({
  href,
  title = "Create your brandbook first",
  subtitle = "Define your brand style for consistent, on-brand posts",
  compact = false,
}: BrandbookCtaProps) {
  return (
    <Link
      href={href}
      className="brandbook-cta relative block rounded-2xl bg-gradient-to-r from-violet-500/20 via-cyan-500/20 to-pink-500/20 border-2 border-violet-500/40 hover:border-violet-500/60 text-center overflow-hidden transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-violet-500/10"
    >
      <div className="brandbook-cta-shine absolute inset-0 pointer-events-none" aria-hidden />
      <div className={`relative ${compact ? "p-4" : "p-6"}`}>
        <p className={`font-bold text-white ${compact ? "text-base" : "text-xl"}`}>{title}</p>
        <p className={`text-zinc-400 mt-1 ${compact ? "text-xs" : "text-sm"}`}>{subtitle}</p>
      </div>
    </Link>
  );
}
