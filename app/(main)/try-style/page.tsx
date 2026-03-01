"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getLandingStyleById } from "@/lib/landing-styles";

export default function TryStylePage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [post, setPost] = useState<{
    id: string;
    visual_url: string | null;
    caption: { igCaption?: string };
    content_idea: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);

  const urlStyleId = searchParams.get("styleId");
  const urlContentIdea = searchParams.get("contentIdea");
  const [storedStyleId, setStoredStyleId] = useState<string | null>(null);
  const [storedContentIdea, setStoredContentIdea] = useState<string | null>(null);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  const styleId = urlStyleId || storedStyleId;
  const contentIdea = urlContentIdea ?? storedContentIdea;
  const style = styleId ? getLandingStyleById(styleId) : null;

  useEffect(() => {
    if (urlStyleId) {
      setHasCheckedStorage(true);
      return;
    }
    if (typeof window !== "undefined") {
      setStoredStyleId(sessionStorage.getItem("tryStyle_styleId"));
      setStoredContentIdea(sessionStorage.getItem("tryStyle_contentIdea"));
      setHasCheckedStorage(true);
    }
  }, [urlStyleId]);

  useEffect(() => {
    if (!hasCheckedStorage) return;
    if (!styleId || !style) {
      setStatus("error");
      setError("Invalid style. Please go back and try again.");
      return;
    }

    const run = async () => {
      try {
        const res = await fetch("/api/try-style", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleId,
            contentIdea: contentIdea || "",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setError(data.error || "Failed to generate post");
          return;
        }

        setPost(data);
        setCreditsRemaining(data.credits_remaining ?? null);
        setStatus("success");

        if (typeof window !== "undefined") {
          sessionStorage.removeItem("tryStyle_styleId");
          sessionStorage.removeItem("tryStyle_contentIdea");
          sessionStorage.removeItem("tryStyle_visualAdvice");
        }
      } catch (e) {
        setStatus("error");
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    };

    run();
  }, [hasCheckedStorage, styleId, contentIdea, style]);

  if (status === "loading") {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <div className="inline-block w-10 h-10 border-2 border-violet-500/50 border-t-violet-500 rounded-full animate-spin mb-6" />
        <h2 className="text-xl font-semibold text-white mb-2">Creating your post...</h2>
        <p className="text-zinc-400 text-sm">
          Using the &quot;{style?.category}&quot; style. This may take up to a minute.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="max-w-xl mx-auto py-12 text-center">
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 mb-6">
          {error}
        </div>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="max-w-xl mx-auto py-8">
      <h2 className="text-2xl font-bold text-white mb-2">Your post is ready</h2>
      <p className="text-zinc-400 text-sm mb-6">
        Generated with the &quot;{style?.category}&quot; style. 1 credit used.
        {creditsRemaining !== null && (
          <span className="block mt-1">Credits remaining: {creditsRemaining}</span>
        )}
      </p>

      <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5 mb-6">
        {post.visual_url && (
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={post.visual_url}
              alt="Generated post"
              fill
              className="object-cover"
              unoptimized={post.visual_url.startsWith("data:")}
            />
          </div>
        )}
        {post.caption?.igCaption && (
          <div className="p-4 border-t border-white/10">
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{post.caption.igCaption}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={`/posts/${post.id}/review`}
          className="flex-1 py-3 rounded-xl gradient-ai text-white font-semibold text-center hover:opacity-90 transition-opacity"
        >
          View & Download
        </Link>
        <Link
          href="/brand-spaces/new"
          className="flex-1 py-3 rounded-xl border border-violet-500/50 text-violet-400 font-medium text-center hover:bg-violet-500/10 transition-colors"
        >
          Create Brandbook for consistent posts
        </Link>
      </div>

      <p className="text-xs text-zinc-500 text-center mt-6">
        Add a brandbook to keep your future posts on-brand with your logo, colors, and style.
      </p>
    </div>
  );
}
