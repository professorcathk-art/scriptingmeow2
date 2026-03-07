"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { AddIdeaForm } from "./add-idea-form";

type Post = {
  id: string;
  visual_url?: string;
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
};

interface LibraryTabsProps {
  activeTab: string;
  posts: Post[];
  references: Reference[];
  postIdeas: PostIdea[];
  brandSpaces: { id: string; name: string }[];
  formatDate: (date: string) => string;
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
  brandSpaces,
  formatDate,
}: LibraryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState(initialTab || "posts");
  const [ideas, setIdeas] = useState(postIdeas);
  const [showAddIdea, setShowAddIdea] = useState(false);

  useEffect(() => {
    setTab(initialTab || "posts");
  }, [initialTab]);

  useEffect(() => {
    setIdeas(postIdeas);
  }, [postIdeas]);

  const handleTabChange = (id: string) => {
    setTab(id);
    const params = new URLSearchParams(searchParams.toString());
    if (id !== "posts") params.set("tab", id);
    else params.delete("tab");
    router.push(`/library?${params.toString()}`);
  };

  const tabs = [
    { id: "posts", label: "My Posts" },
    { id: "references", label: "References" },
    { id: "ideas", label: "Idea Bank" },
  ];

  const handleAddIdea = (idea: PostIdea) => {
    setIdeas((prev) => [idea, ...prev]);
    setShowAddIdea(false);
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
      <div className="flex gap-2 border-b border-white/10 pb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabChange(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.id ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

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
                    {post.visual_url ? (
                      <Image src={post.visual_url} alt="Post" width={200} height={200} className="w-full h-full object-cover" />
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

      {tab === "ideas" && (
        <>
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setShowAddIdea(true)}
              className="px-4 py-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 transition-colors text-sm"
            >
              + Add idea
            </button>
          </div>
          {showAddIdea && (
            <AddIdeaForm onAdd={handleAddIdea} onCancel={() => setShowAddIdea(false)} />
          )}
          {ideas.length > 0 ? (
            <div className="space-y-3">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-white/10 flex justify-between items-start gap-4"
                >
                  <p className="text-zinc-300 text-sm flex-1 whitespace-pre-wrap">{idea.content}</p>
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
