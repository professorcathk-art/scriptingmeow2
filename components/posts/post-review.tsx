"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedPost } from "@/types/database";

interface PostReviewProps {
  post: GeneratedPost & { brand_spaces?: { name: string } };
}

export function PostReview({ post: initialPost }: PostReviewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState(initialPost);
  const [caption, setCaption] = useState(initialPost.caption);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setPost(initialPost);
    setCaption(initialPost.caption);
  }, [initialPost]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          status: "saved",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save post");
      }

      router.push("/library");
    } catch (error) {
      console.error("Error saving post:", error);
      alert("Failed to save post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/posts/${post.id}/regenerate`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate post");
      }

      const data = await response.json();
      setPost(data);
      setCaption(data.caption);
      setImageError(false);
    } catch (error) {
      console.error("Error regenerating post:", error);
      alert("Failed to regenerate post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Review Your Post</h1>
        <p className="text-zinc-400">
          Brand: {post.brand_spaces?.name || "Unknown"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-elevated p-6 rounded-2xl">
          <h2 className="text-xl font-semibold text-white mb-4">Visual Preview</h2>
          <div className="aspect-square bg-white/5 rounded-xl flex items-center justify-center overflow-hidden">
            {post.visual_url && !imageError ? (
              <img
                src={post.visual_url}
                alt="Post visual"
                className="w-full h-full object-cover rounded-lg"
                onError={() => setImageError(true)}
              />
            ) : (
              <span className="text-zinc-500 text-sm">
                {imageError ? "Image failed to load" : "Visual will be generated"}
              </span>
            )}
          </div>
        </div>

        <div className="glass-elevated p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Caption</h2>
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="text-sm text-violet-400 hover:text-violet-300 disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Hook
              </label>
              <textarea
                value={caption.hook}
                onChange={(e) =>
                  setCaption({ ...caption, hook: e.target.value })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Body
              </label>
              <textarea
                value={caption.body}
                onChange={(e) =>
                  setCaption({ ...caption, body: e.target.value })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Call to Action
              </label>
              <textarea
                value={caption.cta}
                onChange={(e) =>
                  setCaption({ ...caption, cta: e.target.value })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Hashtags
              </label>
              <input
                type="text"
                value={Array.isArray(caption.hashtags) ? caption.hashtags.join(" ") : ""}
                onChange={(e) =>
                  setCaption({
                    ...caption,
                    hashtags: e.target.value.split(" ").filter((h) => h.trim()),
                  })
                }
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                placeholder="#hashtag1 #hashtag2"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => router.back()}
          className="flex-1 px-4 py-2 border border-white/10 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 px-4 py-2 rounded-xl gradient-ai text-white font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Saving..." : "Save to Library"}
        </button>
      </div>
    </div>
  );
}
