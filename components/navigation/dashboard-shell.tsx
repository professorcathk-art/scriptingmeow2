"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { CreditRing } from "@/components/credits/credit-ring";

function NavIconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}
function NavIconFolder({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}
function NavIconPen({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  );
}
function NavIconLayers({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}
function NavIconLibrary({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  );
}
function NavIconDiscover({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}
function NavIconDefault({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

const navIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": NavIconDashboard,
  "/discover": NavIconDiscover,
  "/brand-spaces": NavIconFolder,
  "/create-post": NavIconPen,
  "/bulk-create": NavIconLayers,
  "/design-playground": NavIconLayers,
  "/library": NavIconLibrary,
  "/billing": NavIconDefault,
};

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
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between w-full gap-2">
            <div className="flex items-center gap-3 min-w-0 shrink-0">
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
            <div className="flex items-center gap-3 shrink-0">
              <CreditRing />
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 pb-20 md:pb-6 overflow-auto min-w-0 w-full">
          {children}
        </div>
      </main>

      {/* Mobile bottom navigation - icons + tiny labels */}
      <nav className="fixed bottom-0 left-0 right-0 w-full flex justify-around items-center bg-black/90 backdrop-blur-sm border-t border-white/5 pb-4 pt-2 z-50 md:hidden">
        {navItems.slice(0, 5).map((item) => {
          const Icon = navIcons[item.href] ?? NavIconDefault;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-2 min-w-0 flex-1 transition-colors",
                pathname === item.href ? "text-white" : "text-zinc-400"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] font-medium truncate w-full text-center max-w-[4rem]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
