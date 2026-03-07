"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type RssFeed = {
  id: string;
  rss_url: string;
  title: string | null;
  created_at: string;
  last_fetched_at: string | null;
};

type RssIdea = {
  id: string;
  content: string;
  title: string | null;
  link: string | null;
  rss_feed_id?: string;
  created_at: string;
};

function FolderIcon() {
  return (
    <svg className="w-16 h-16 text-zinc-500/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

export function RssAutofeedTab() {
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [ideas, setIdeas] = useState<RssIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [rssUrl, setRssUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/library/rss");
      if (res.status === 403) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "RSS Autofeed is for paid plans only");
        setFeeds([]);
        setIdeas([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setFeeds(data.feeds ?? []);
      setIdeas(data.ideas ?? []);
    } catch {
      setError("Failed to load RSS data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddFeed = async () => {
    const url = rssUrl.trim();
    if (!url || !url.startsWith("http")) {
      setError("Enter a valid RSS URL");
      return;
    }
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/library/rss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rssUrl: url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to add feed");
      }
      setRssUrl("");
      await fetchData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add feed");
    } finally {
      setAdding(false);
    }
  };

  const handleRefresh = async (feedId: string) => {
    try {
      const res = await fetch(`/api/library/rss/${feedId}/refresh`, { method: "POST" });
      if (!res.ok) throw new Error("Refresh failed");
      await fetchData();
    } catch {
      setError("Failed to refresh feed");
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm("Delete this feed and its ideas?")) return;
    try {
      const res = await fetch(`/api/library/rss/${feedId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchData();
    } catch {
      setError("Failed to delete feed");
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-zinc-400">
        Loading RSS feeds...
      </div>
    );
  }

  if (error && feeds.length === 0 && ideas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-white/10">
        <FolderIcon />
        <p className="text-zinc-400 mt-4 mb-2">{error}</p>
        <Link href="/settings" className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90">
          Upgrade Plan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          placeholder="https://example.com/feed.xml"
          value={rssUrl}
          onChange={(e) => setRssUrl(e.target.value)}
          className="flex-1 px-4 py-2 rounded-xl bg-zinc-900/50 border border-white/10 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
        />
        <button
          type="button"
          onClick={handleAddFeed}
          disabled={adding}
          className="px-4 py-2 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 hover:bg-violet-500/30 disabled:opacity-50 transition-colors text-sm"
        >
          {adding ? "Adding..." : "+ Add RSS Feed"}
        </button>
      </div>
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {feeds.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-400">Your RSS Feeds</h3>
          <div className="space-y-2">
            {feeds.map((feed) => (
              <div
                key={feed.id}
                className="p-4 rounded-xl bg-zinc-900/50 border border-white/10 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-zinc-100 font-medium truncate">{feed.title || feed.rss_url}</p>
                  <p className="text-xs text-zinc-500 truncate">{feed.rss_url}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleRefresh(feed.id)}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFeed(feed.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {ideas.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-400">RSS Ideas</h3>
          <div className="space-y-3">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className="p-4 rounded-xl bg-zinc-900/50 border border-white/10 flex justify-between items-start gap-4"
              >
                <div className="min-w-0 flex-1">
                  {idea.title && (
                    <p className="text-zinc-200 font-medium mb-1 line-clamp-1">{idea.title}</p>
                  )}
                  <p className="text-zinc-400 text-sm whitespace-pre-wrap line-clamp-3">{idea.content}</p>
                </div>
                <Link
                  href={`/create-post?rssIdeaId=${idea.id}`}
                  className="text-xs text-violet-400 hover:text-violet-300 shrink-0"
                >
                  Use
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {feeds.length === 0 && ideas.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-white/10">
          <FolderIcon />
          <p className="text-zinc-400 mt-4 mb-2">Add an RSS feed to turn news into post ideas</p>
          <p className="text-zinc-500 text-sm mb-4">Paste an RSS URL above and click Add RSS Feed</p>
        </div>
      )}
    </div>
  );
}
