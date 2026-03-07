"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { DesignPlaygroundForm } from "./design-playground-form";

interface Thread {
  id: string;
  title: string;
  prompt?: string;
  dimension?: string;
  created_at: string;
  updated_at: string;
}

interface ThreadWithItems extends Thread {
  items: { id: string; image_url: string; step_index: number; prompt?: string; comment?: string; created_at: string }[];
}

interface DesignPlaygroundThreadsProps {
  brandSpaces: { id: string; name: string }[];
  userCredits: number;
}

export function DesignPlaygroundThreads({
  brandSpaces,
  userCredits,
}: DesignPlaygroundThreadsProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<ThreadWithItems | null>(null);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [creatingThread, setCreatingThread] = useState(false);

  const fetchThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const res = await fetch("/api/design-playground/threads");
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.threads)) {
        setThreads(data.threads);
      }
    } catch {
      setThreads([]);
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const fetchThread = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/design-playground/threads/${id}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.thread) {
        setActiveThread({ ...data.thread, items: data.items ?? [] });
      } else {
        setActiveThread(null);
      }
    } catch {
      setActiveThread(null);
    }
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    if (activeThreadId) {
      fetchThread(activeThreadId);
    } else {
      setActiveThread(null);
    }
  }, [activeThreadId, fetchThread]);

  const handleNewThread = async () => {
    setCreatingThread(true);
    try {
      const res = await fetch("/api/design-playground/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled design" }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.thread) {
        setThreads((prev) => [data.thread, ...prev]);
        setActiveThreadId(data.thread.id);
      }
    } catch {
      // fallback: just open form without persisted thread (thread created on first generate)
      setActiveThreadId("new");
    } finally {
      setCreatingThread(false);
    }
  };

  const handleCloseThread = () => {
    setActiveThreadId(null);
    setActiveThread(null);
    fetchThreads();
  };

  const latestImageUrl = (t: Thread) => {
    const tw = t as Thread & { items?: { image_url: string }[] };
    return tw.items?.[tw.items.length - 1]?.image_url;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleNewThread}
          disabled={creatingThread}
          className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50"
        >
          {creatingThread ? "Creating…" : "+ New design"}
        </button>
        {activeThreadId && activeThreadId !== "new" && (
          <button
            type="button"
            onClick={handleCloseThread}
            className="px-4 py-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
          >
            Back to all designs
          </button>
        )}
      </div>

      {activeThreadId ? (
        <div className="space-y-4">
          <DesignPlaygroundForm
            brandSpaces={brandSpaces}
            userCredits={userCredits}
            threadId={activeThreadId === "new" ? undefined : activeThreadId}
            initialPrompt={activeThread?.prompt ?? ""}
            initialDimension={activeThread?.dimension ?? "1:1"}
            initialItems={activeThread?.items ?? []}
            onThreadId={(id) => {
              setActiveThreadId(id);
              fetchThreads();
            }}
          />
        </div>
      ) : (
        <>
          {loadingThreads ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-zinc-800/50 border border-white/10 animate-pulse"
                />
              ))}
            </div>
          ) : threads.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className="block text-left rounded-xl border border-white/10 bg-zinc-900/50 overflow-hidden hover:border-violet-500/30 transition-all"
                >
                  <div className="aspect-square bg-zinc-800/50 flex items-center justify-center overflow-hidden">
                    {latestImageUrl(thread) ? (
                      <Image
                        src={latestImageUrl(thread)!}
                        alt={thread.title}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-zinc-500 text-sm">No image yet</span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-zinc-100 truncate">
                      {thread.title}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {new Date(thread.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-white/10 p-12 text-center">
              <p className="text-zinc-400 mb-4">No designs yet. Start your first design.</p>
              <button
                type="button"
                onClick={handleNewThread}
                disabled={creatingThread}
                className="px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90"
              >
                + New design
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
