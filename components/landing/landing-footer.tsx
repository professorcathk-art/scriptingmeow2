"use client";

import Link from "next/link";

type FooterLink = { label: string; href: string };

const PRODUCT: FooterLink[] = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
];

const RESOURCES: FooterLink[] = [
  { label: "Guides", href: "/guides" },
  { label: "Support", href: "/support" },
];

const LEGAL: FooterLink[] = [
  { label: "Terms of Service", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-white/5 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
          <div className="col-span-2 md:col-span-1">
            <span className="text-xl font-bold text-zinc-100 mb-4 block">
              designermeow
            </span>
            <p className="text-zinc-400 text-sm max-w-xs">
              Turn your brand identity into consistent, on-brand Instagram posts in a few clicks.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-100 mb-4 uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2">
              {PRODUCT.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-100 mb-4 uppercase tracking-wider">
              Resources
            </h4>
            <ul className="space-y-2">
              {RESOURCES.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-100 mb-4 uppercase tracking-wider">
              Legal
            </h4>
            <ul className="space-y-2">
              {LEGAL.map(({ label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5">
          <p className="text-sm text-zinc-500 text-center">
            © {new Date().getFullYear()} designermeow. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
