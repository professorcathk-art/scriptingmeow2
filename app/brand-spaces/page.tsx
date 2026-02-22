import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PLAN_LIMITS, type PlanTier } from "@/types/database";
import { redirect } from "next/navigation";

export default async function BrandSpacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: userProfile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: brandSpaces } = await supabase
    .from("brand_spaces")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const brandSpaceCount = brandSpaces?.length || 0;
  const brandSpaceLimit = userProfile
    ? PLAN_LIMITS[userProfile.plan_tier as PlanTier].brand_spaces
    : 1;
  const canCreateMore = brandSpaceCount < brandSpaceLimit;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Brand Spaces</h1>
          <p className="text-gray-600 mt-1">
            {brandSpaceCount} / {brandSpaceLimit} Brand Spaces used
          </p>
        </div>
        {canCreateMore ? (
          <Link
            href="/brand-spaces/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Brand Space
          </Link>
        ) : (
          <Link
            href="/billing"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upgrade to Create More
          </Link>
        )}
      </div>

      {brandSpaces && brandSpaces.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {brandSpaces.map((brandSpace) => (
            <Link
              key={brandSpace.id}
              href={`/brand-spaces/${brandSpace.id}`}
              className="block p-6 bg-white rounded-lg border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {brandSpace.avatar_url ? (
                  <img
                    src={brandSpace.avatar_url}
                    alt={brandSpace.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                    <span className="text-2xl">
                      {brandSpace.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {brandSpace.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {brandSpace.brand_type.replace("-", " ")}
                  </p>
                  {brandSpace.style_summary && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {brandSpace.style_summary}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed">
          <p className="text-gray-600 mb-4">
            You don&apos;t have any Brand Spaces yet.
          </p>
          {canCreateMore && (
            <Link
              href="/brand-spaces/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Brand Space
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
