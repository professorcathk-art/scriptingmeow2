"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AddIdeaForm } from "./add-idea-form";
import { RssAutofeedTab } from "./rss-autofeed-tab";
import { IdeaBankAiPanel } from "./idea-bank-ai-panel";
import { formatIdeaForDisplay } from "@/lib/idea-content";

type Post = {
  id: string;
  visual_url?: string;
  carousel_urls?: string[] | null;
  content_idea?: string;
  created_at: string;
  tags?: string[];
  brand_spaces?: { name?: string };
};

type Reference = {
  id: string;
  image_url: string;
  created_at: string;
  source: string;
};

type PostIdea = {
  id: string;
  content: string;
  created_at: string;
  brand_space_id?: string | null;
  brandName?: string;
};

type MyDesignItem = {
  id: string;
  image_url: string;
  created_at: string;
  metadata?: Record<string, unknown>;
  source_id?: string | null;
};

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface LibraryTabsProps {
  activeTab: string;
  posts: Post[];
  references: Reference[];
  postIdeas: PostIdea[];
  myDesignItems?: MyDesignItem[];
  brandSpaces: { id: string; name: string }[];
  planTier?: string;
}

function FolderIcon() {
  return (
    <svg className="w-16 h-16 text-zinc-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

export function LibraryTabs({
  activeTab: initialTab,
  posts,
  references,
  postIdeas,
  myDesignItems = [],
  brandSpaces,
  planTier = "free",
}: LibraryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(initialTab || "all");
  const [ideas, setIdeas] = useState(postIdeas);
  const [showAddIdea, setShowAddIdea] = useState(false);
  const [ideaBrandFilter, setIdeaBrandFilter] = useState<string>("");

  useEffect(() => {
    setTab(initialTab || "all");
  }, [initialTab]);

  useEffect(() => {
    setIdeas(postIdeas);
  }, [postIdeas]);

  const handleTabChange = (id: string) => {
    setTab(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id !== "all") params.set("tab", id);
    else params.delete("tab");
    router.push(`/library?${params.toString()}`);
  };

  const tabs = [
    { id: "all", label: "All" },
    { id: "posts", label: "My Posts" },
    { id: "my-design", label: "My design" },
    { id: "references", label: "References" },
    { id: "ideas", label: "Idea Bank" },
    ...(planTier !== "free" ? [{ id: "rss", label: "RSS Autofeed" }] : []),
  ];

  type AllItem =
    | { type: "post"; id: string; imageUrl: string; created_at: string; label?: string; href: string }
    | { type: "design"; id: string; imageUrl: string; created_at: string; label: string; href: string }
    | { type: "reference"; id: string; imageUrl: string; created_at: string; label: string; href?: string };
  const allItems: AllItem[] = [
    ...posts.map((p) => ({
      type: "post" as const,
      id: p.id,
      imageUrl: (p.carousel_urls?.[0] ?? p.visual_url) ?? "",
      created_at: p.created_at,
      label: p.brand_spaces?.name,
      href: `/posts/${p.id}/review`,
    })),
    ...myDesignItems.map((d) => ({
      type: "design" as const,
      id: d.id,
      imageUrl: d.image_url,
      created_at: d.created_at,
      label: "Design Playground",
      href: d.source_id ? `/design-playground?thread=${d.source_id}` : "/design-playground",
    })),
    ...references.map((r) => ({
      type: "reference" as const,
      id: r.id,
      imageUrl: r.image_url,
      created_at: r.created_at,
      label: r.source,
      href: undefined as string | undefined,
    })),
  ].filter((i) => i.imageUrl).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleAddIdea = (idea: PostIdea) => {
    setIdeas((prev) => [idea, ...prev]);
    setShowAddIdea(false);
  };

  const enrichIdeas = (raw: PostIdea[]): PostIdea[] =>
    raw.map((i) => ({
      ...i,
      brandName: i.brand_space_id
        ? brandSpaces.find((b) => b.id === i.brand_space_id)?.name
        : undefined,
    }));

  const refreshIdeas = async () => {
    try {
      const q = ideaBrandFilter
        ? `/api/library/ideas?brandSpaceId=${encodeURIComponent(ideaBrandFilter)}`
        : "/api/library/ideas";
      const res = await fetch(q);
      if (!res.ok) return;
      const data = await res.json();
      setIdeas(enrichIdeas(data.ideas ?? []));
    } catch {
      // ignore
    }
  };

  const handleDeleteIdea = async (id: string) => {
    try {
      await fetch(`/api/library/ideas/${id}`, { method: "DELETE" });
      setIdeas((prev) => prev.filter((i) => i.id !== id));
    } catch {
      alert("Failed to delete");
    }
  };

  return (
    <>
      <div className="flex overflow-x-auto whitespace-nowrap gap-2 pb-2 border-b border-white/10 hide-scrollbar -mx-2 px-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabChange(t.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.id ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "all" && (
        <>
          {allItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {allItems.map((item) => {
                const cardContent = (
                  <>
                    <div className="aspect-square bg-zinc-800/50 relative overflow-hidden">
                      <Image
                        src={item.imageUrl}
                        alt={item.label ?? "Asset"}
                        fill
                        className="object-cover"
                        unoptimized={item.imageUrl.startsWith("data:")}
                      />
                    </div>
                    <div className="p-2 sm:p-4">
                      <p className="text-xs sm:text-sm font-medium text-zinc-100 mb-0.5 truncate">
                        {item.label ?? "Unknown"}
                      </p>
                      <span className="text-[10px] text-zinc-500">{formatDate(item.created_at)}</span>
                    </div>
                  </>
                );
                const cardClass = "block bg-zinc-900/50 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden hover:border-violet-500/30 transition-all";
                return item.href ? (
                  <Link key={`${item.type}-${item.id}`} href={item.href} className={cardClass}>
                    {cardContent}
                  </Link>
                ) : (
                  <div key={`${item.type}-${item.id}`} className={cardClass}>
                    {cardContent}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-white/10">
              <FolderIcon />
              <p className="text-zinc-400 mt-4 mb-2">Your posts, designs, and references will appear here</p>
              <Link href="/create-post" className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90">
                Create Your First Post
              </Link>
            </div>
          )}
        </>
      )}

      {tab === "posts" && (
        <>
          {posts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}/review`}
                  className="block bg-zinc-900/50 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden hover:border-violet-500/30 transition-all"
                >
                  <div className="aspect-square bg-zinc-800/50 flex items-center justify-center overflow-hidden">
                    {(post.carousel_urls?.[0] ?? post.visual_url) ? (
                      <Image src={post.carousel_urls?.[0] ?? post.visual_url ?? ""} alt="Post" width={200} height={200} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-zinc-500 text-xs">No visual</span>
                    )}
                  </div>
                  <div className="p-2 sm:p-4">
                    <p className="text-xs sm:text-sm font-medium text-zinc-100 mb-0.5 truncate">
                      {post.brand_spaces?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-zinc-500 line-clamp-2">{post.content_idea}</p>
                    <span className="text-[10px] text-zinc-500">{formatDate(post.created_at)}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-white/10">
              <FolderIcon />
              <p className="text-zinc-400 mt-4 mb-2">Your generated posts will appear here</p>
              <Link href="/create-post" className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90">
                Create Your First Post
              </Link>
            </div>
          )}
        </>
      )}

      {tab === "my-design" && (
        <>
          {myDesignItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {myDesignItems.map((item) => {
                const threadHref = item.source_id
                  ? `/design-playground?thread=${item.source_id}`
                  : "/design-playground";
                return (
                  <Link
                    key={item.id}
                    href={threadHref}
                    className="block bg-zinc-900/50 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden hover:border-violet-500/30 transition-all"
                  >
                    <div className="aspect-square bg-zinc-800/50 relative overflow-hidden">
                      <Image
                        src={item.image_url}
                        alt="Design"
                        fill
                        className="object-cover"
                        unoptimized={item.image_url.startsWith("data:")}
                      />
                    </div>
                    <div className="p-2 sm:p-4">
                      <p className="text-xs text-zinc-500">Design Playground</p>
                      <span className="text-[10px] text-zinc-500">{formatDate(item.created_at)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-white/10">
              <FolderIcon />
              <p className="text-zinc-400 mt-4 mb-2">Designs from Design Playground appear here</p>
              <Link href="/design-playground" className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90">
                Go to Design Playground
              </Link>
            </div>
          )}
        </>
      )}

      {tab === "references" && (
        <>
          {references.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {references.map((ref) => (
                <div
                  key={ref.id}
                  className="block bg-zinc-900/50 rounded-xl sm:rounded-2xl border border-white/10 overflow-hidden"
                >
                  <div className="aspect-square bg-zinc-800/50 relative overflow-hidden">
                    <Image
                      src={ref.image_url}
                      alt="Reference"
                      fill
                      className="object-cover"
                      unoptimized={ref.image_url.startsWith("data:")}
                    />
                  </div>
                  <div className="p-2 sm:p-4">
                    <p className="text-xs text-zinc-500">{ref.source}</p>
                    <span className="text-[10px] text-zinc-500">{formatDate(ref.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-white/10">
              <FolderIcon />
              <p className="text-zinc-400 mt-4 mb-2">Upload reference images in your brandbook or save styles from the homepage</p>
              <Link href="/" className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90">
                Browse Styles
              </Link>
            </div>
          )}
        </>
      )}

      {tab === "rss" && <RssAutofeedTab brandSpaces={brandSpaces} />}

      {tab === "ideas" && (
        <>
          <IdeaBankAiPanel brandSpaces={brandSpaces} onSaved={refreshIdeas} />
          <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
            <label className="text-sm text-zinc-400 shrink-0">Filter by brand</label>
            <select
              value={ideaBrandFilter}
              onChange={(e) => {
                const v = e.target.value;
                setIdeaBrandFilter(v);
                fetch(v ? `/api/library/ideas?brandSpaceId=${encodeURIComponent(v)}` : "/api/library/ideas")
                  .then((r) => r.json())
                  .then((data) => setIdeas(enrichIdeas(data.ideas ?? [])))
                  .catch(() => {});
              }}
              className="px-4 py-2 rounded-xl bg-zinc-800/50 border border-white/10 text-zinc-100 text-sm max-w-xs"
            >
              <option value="">All brands</option>
              {brandSpaces.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowAddIdea(true)}
              className="px-4 py-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-colors text-sm w-fit"
            >
              + Add idea
            </button>
          </div>
          {showAddIdea && (
            <AddIdeaForm
              brandSpaces={brandSpaces}
              onAdd={handleAddIdea}
              onCancel={() => setShowAddIdea(false)}
            />
          )}
          {ideas.length > 0 ? (
            <div className="space-y-3">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-white/10 flex justify-between items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    {idea.brandName && (
                      <span className="inline-block mb-1 px-2 py-0.5 rounded-md bg-violet-500/15 text-violet-300 text-xs">
                        {idea.brandName}
                      </span>
                    )}
                    <p className="text-zinc-300 text-sm whitespace-pre-wrap break-words">
                      {formatIdeaForDisplay(idea.content)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href={`/create-post?ideaId=${idea.id}`}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      Use
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteIdea(idea.id)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : !showAddIdea && (
            <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-white/10">
              <FolderIcon />
              <p className="text-zinc-400 mt-4 mb-2">Save post ideas to reuse when creating posts</p>
              <button
                type="button"
                onClick={() => setShowAddIdea(true)}
                className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90"
              >
                Add your first idea
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
