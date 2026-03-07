import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { PublicPageLayout } from "@/components/landing/public-page-layout";
import type { Metadata } from "next";

interface DiscoverDetailPageProps {
  params: { id: string };
}

async function getPost(id: string) {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return null;
  }
  const { data: post } = await supabase
    .from("generated_posts")
    .select("id, visual_url, carousel_urls, content_idea, brand_space_id, created_at")
    .eq("id", id)
    .eq("is_public_gallery", true)
    .eq("status", "saved")
    .single();

  if (!post) return null;

  const { data: brandSpace } = await supabase
    .from("brand_spaces")
    .select("user_id")
    .eq("id", post.brand_space_id)
    .single();

  let instagramHandle: string | null = null;
  if (brandSpace?.user_id) {
    const { data: user } = await supabase
      .from("users")
      .select("instagram_handle")
      .eq("id", brandSpace.user_id)
      .single();
    instagramHandle = user?.instagram_handle ?? null;
  }

  return { ...post, instagram_handle: instagramHandle };
}

export async function generateMetadata({ params }: DiscoverDetailPageProps): Promise<Metadata> {
  const post = await getPost(params.id);
  if (!post) {
    return { title: "Design not found | designermeow" };
  }

  const imageUrl = post.carousel_urls?.[0] ?? post.visual_url;
  const title = post.content_idea
    ? `${post.content_idea.slice(0, 60)}${post.content_idea.length > 60 ? "…" : ""} | designermeow Discover`
    : "Design | designermeow Discover";

  return {
    title,
    description: `AI-generated Instagram design${post.content_idea ? `: ${post.content_idea.slice(0, 120)}` : ""}. Create your own with designermeow.`,
    openGraph: {
      title,
      description: "Create your own AI Instagram posts with designermeow.",
      images: imageUrl ? [{ url: imageUrl, width: 1080, height: 1080, alt: post.content_idea?.slice(0, 100) ?? "Design" }] : [],
      url: `https://designermeow.com/discover/${params.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: imageUrl ? [imageUrl] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function DiscoverDetailPage({ params }: DiscoverDetailPageProps) {
  const post = await getPost(params.id);
  if (!post) notFound();

  const imageUrl = post.carousel_urls?.[0] ?? post.visual_url;
  const handle = post.instagram_handle;
  const handleClean = handle?.replace(/^@/, "") ?? "";

  return (
    <PublicPageLayout>
      <div className="max-w-4xl mx-auto">
        <Link href="/discover" className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm mb-8">
          ← Back to Discover
        </Link>

        <div className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/50 shadow-2xl">
          {imageUrl ? (
            <div className="relative aspect-square max-w-2xl mx-auto">
              <Image
                src={imageUrl}
                alt={post.content_idea?.slice(0, 100) ?? "Design"}
                fill
                className="object-contain"
                priority
                sizes="(max-width: 768px) 100vw, 672px"
              />
            </div>
          ) : (
            <div className="aspect-square flex items-center justify-center text-zinc-500">
              No image available
            </div>
          )}
        </div>

        <div className="mt-8 space-y-4">
          {post.content_idea && (
            <p className="text-zinc-300 text-lg">{post.content_idea}</p>
          )}

          {handle && (
            <a
              href={`https://instagram.com/${handleClean}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              Follow designer {handle} on Instagram
            </a>
          )}
        </div>

        <div className="h-24" />

        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4">
          <Link
            href="/auth/signup"
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-ai text-white font-semibold shadow-lg hover:opacity-90 transition-opacity text-center text-sm sm:text-base"
          >
            Like this style? Create your own post with designermeow
          </Link>
        </div>
      </div>
    </PublicPageLayout>
  );
}
