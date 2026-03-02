"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/**
 * Legacy /try-style redirects to /create-post with same params.
 * The new flow uses create-post with prefill.
 */
export default function TryStylePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const styleId = searchParams.get("styleId");
    const contentIdea = searchParams.get("contentIdea");
    const params = new URLSearchParams();
    if (styleId) params.set("styleId", styleId);
    if (contentIdea) params.set("contentIdea", contentIdea);
    const query = params.toString();
    router.replace(`/create-post${query ? `?${query}` : ""}`);
  }, [searchParams, router]);

  return (
    <div className="max-w-xl mx-auto py-12 text-center">
      <div className="inline-block w-10 h-10 border-2 border-violet-500/50 border-t-violet-500 rounded-full animate-spin mb-6" />
      <p className="text-zinc-400 text-sm">Redirecting to create post...</p>
    </div>
  );
}
