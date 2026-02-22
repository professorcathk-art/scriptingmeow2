"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GeneratedPost } from "@/types/database";

interface PostReviewProps {
  post: GeneratedPost & { brand_spaces?: { name: string } };
}

export function PostReview({ post }: PostReviewProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [caption, setCaption] = useState(post.caption);

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
      setCaption(data.caption);
    } catch (error) {
      console.error("Error regenerating post:", error);
      alert("Failed to regenerate post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Your Post</h1>
        <p className="text-gray-600">
          Brand: {post.brand_spaces?.name || "Unknown"}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Visual Preview</h2>
          <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
            {post.visual_url ? (
              <img
                src={post.visual_url}
                alt="Post visual"
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <span className="text-gray-400">Visual will be generated</span>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Caption</h2>
            <button
              onClick={handleRegenerate}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              Regenerate
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hook
              </label>
              <textarea
                value={caption.hook}
                onChange={(e) =>
                  setCaption({ ...caption, hook: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Body
              </label>
              <textarea
                value={caption.body}
                onChange={(e) =>
                  setCaption({ ...caption, body: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={4}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Call to Action
              </label>
              <textarea
                value={caption.cta}
                onChange={(e) =>
                  setCaption({ ...caption, cta: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="#hashtag1 #hashtag2"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => router.back()}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save to Library"}
        </button>
      </div>
    </div>
  );
}
