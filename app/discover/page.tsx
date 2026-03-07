import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import Image from "next/image";
import { PublicPageLayout } from "@/components/landing/public-page-layout";

export const metadata = {
  title: "Discover Gallery | designermeow - AI Instagram Post Inspiration",
  description:
    "Browse community-shared Instagram post designs. Get inspired by AI-generated content from creators. Create your own with designermeow.",
  openGraph: {
    title: "Discover Gallery | designermeow",
    description: "Browse community-shared Instagram post designs. Create your own with AI.",
    url: "https://designermeow.com/discover",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function DiscoverPage() {
  let supabase;
  try {
    supabase = createAdminClient();
  } catch {
    return (
      <PublicPageLayout>
        <div className="max-w-4xl mx-auto text-center py-24">
          <h1 className="text-3xl font-bold text-white mb-4">Discover Gallery</h1>
          <p className="text-zinc-400">Gallery is being set up. Please try again later.</p>
        </div>
      </PublicPageLayout>
    );
  }

  const { data: posts } = await supabase
    .from("generated_posts")
    .select("id, visual_url, carousel_urls, content_idea, created_at")
    .eq("is_public_gallery", true)
    .eq("status", "saved")
    .order("created_at", { ascending: false })
    .limit(48);

  const postIds = (posts ?? []).map((p) => p.id);
  if (postIds.length === 0) {
    return (
      <PublicPageLayout>
        <div className="max-w-4xl mx-auto text-center py-24">
          <h1 className="text-3xl font-bold text-white mb-4">Discover Gallery</h1>
          <p className="text-zinc-400 mb-8">
            Community-shared designs will appear here. Create a post and opt in to share it with the world.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </PublicPageLayout>
    );
  }

  const { data: brandSpaces } = await supabase
    .from("generated_posts")
    .select("id, brand_space_id")
    .in("id", postIds);

  const bsIds = [...new Set((brandSpaces ?? []).map((p) => p.brand_space_id))];
  const { data: users } = await supabase
    .from("brand_spaces")
    .select("id, user_id")
    .in("id", bsIds);

  const userIds = [...new Set((users ?? []).map((u) => u.user_id))];
  const { data: userProfiles } = await supabase
    .from("users")
    .select("id, instagram_handle")
    .in("id", userIds);

  const bsToUser = new Map((users ?? []).map((u) => [u.id, u.user_id]));
  const userToHandle = new Map((userProfiles ?? []).map((u) => [u.id, u.instagram_handle]));
  const postToHandle = new Map(
    (brandSpaces ?? []).map((p) => {
      const uid = bsToUser.get(p.brand_space_id);
      return [p.id, uid ? userToHandle.get(uid) : null];
    })
  );

  return (
    <PublicPageLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">Discover Gallery</h1>
          <p className="text-zinc-400">
            Community-shared designs from creators. Get inspired and create your own with designermeow.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {(posts ?? []).map((post) => {
            const imageUrl = post.carousel_urls?.[0] ?? post.visual_url;
            const handle = postToHandle.get(post.id);
            return (
              <Link
                key={post.id}
                href={`/discover/${post.id}`}
                className="block rounded-xl overflow-hidden border border-white/10 bg-zinc-900/50 hover:border-violet-500/30 transition-all group"
              >
                <div className="aspect-square bg-zinc-800/50 relative overflow-hidden">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={post.content_idea?.slice(0, 60) ?? "Design"}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
                      No image
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-zinc-500 line-clamp-2">{post.content_idea?.slice(0, 80)}</p>
                  {handle && (
                    <p className="text-xs text-violet-400 mt-1 truncate">{handle}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/auth/signup"
            className="inline-block px-6 py-3 rounded-xl gradient-ai text-white font-medium hover:opacity-90"
          >
            Create your own with designermeow
          </Link>
        </div>
      </div>
    </PublicPageLayout>
  );
}
