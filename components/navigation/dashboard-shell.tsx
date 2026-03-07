"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CreditRing } from "@/components/credits/credit-ring";

const navItemsBase = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/brand-spaces", label: "Brand Spaces" },
  { href: "/create-post", label: "Create Post" },
  { href: "/bulk-create", label: "AI Bulk Create" },
  { href: "/design-playground", label: "Design Playground" },
  { href: "/library", label: "Library" },
  { href: "/billing", label: "Billing" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [discoverCount, setDiscoverCount] = useState(0);

  useEffect(() => {
    fetch("/api/discover/count")
      .then((r) => r.json())
      .then((d) => setDiscoverCount(d.count ?? 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems = discoverCount > 50
    ? [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/discover", label: "Discover" },
        ...navItemsBase.slice(1),
      ]
    : navItemsBase;

  const navLinkClass = (href: string) =>
    cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
      pathname === href
        ? "bg-white/10 text-white"
        : "text-zinc-400 hover:text-white hover:bg-white/5"
    );

  return (
    <div className="min-h-screen bg-zinc-950 flex overflow-x-hidden">
      {/* Mobile overlay backdrop (hamburger menu) */}
      <div
        className={cn(
          "fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity",
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile slide-out menu (hamburger) */}
      <aside
        className={cn(
          "md:hidden fixed inset-y-0 left-0 w-64 glass border-r border-white/5 flex flex-col z-50 transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <Link href="/dashboard" className="text-lg font-bold text-white" onClick={() => setMobileOpen(false)}>
            designermeow
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(item.href)}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Desktop Sidebar: hidden on mobile, inline on md+ */}
      <aside
        className={cn(
          "hidden md:flex glass border-r border-white/5 flex-col transition-all duration-300 shrink-0 z-50",
          "md:relative",
          collapsed ? "md:w-12 lg:w-16" : "md:w-48 lg:w-56"
        )}
      >
        <div className="p-4 flex items-center justify-between">
          {!collapsed && (
            <Link href="/dashboard" className="text-lg font-bold text-white">
              designermeow
            </Link>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors hidden md:flex"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg
                className={cn("w-5 h-5 transition-transform", collapsed && "rotate-180")}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={navLinkClass(item.href)}
            >
              {collapsed ? (
                <span className="w-6 h-6 flex items-center justify-center text-lg">
                  {item.label.charAt(0)}
                </span>
              ) : (
                item.label
              )}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <header className="glass border-b border-white/5 sticky top-0 z-10">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white transition-colors md:hidden shrink-0"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-white truncate">
                  designermeow
                </h1>
                <p className="text-sm text-zinc-500 hidden sm:block">
                  AI-powered Instagram posts
                </p>
              </div>
            </div>
            <CreditRing />
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 pb-20 md:pb-6 overflow-auto min-w-0 w-full">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 w-full flex justify-around items-center bg-black/90 backdrop-blur-sm border-t border-white/5 pb-4 pt-2 z-50 md:hidden">
        {navItems.slice(0, 5).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-0.5 py-2 px-3 min-w-0 flex-1 text-xs font-medium transition-colors",
              pathname === item.href ? "text-white" : "text-zinc-400"
            )}
          >
            <span className="truncate w-full text-center">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
