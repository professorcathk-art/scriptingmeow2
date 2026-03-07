-- Add instagram_handle to users (optional, for Discover Gallery cross-promotion)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT;

-- Add is_public_gallery to generated_posts (opt-in for Discover Gallery)
ALTER TABLE public.generated_posts
  ADD COLUMN IF NOT EXISTS is_public_gallery BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient Discover Gallery queries
CREATE INDEX IF NOT EXISTS idx_generated_posts_is_public_gallery
  ON public.generated_posts(is_public_gallery)
  WHERE is_public_gallery = true;

-- Allow public read access for posts in the Discover Gallery (SEO, no auth required)
CREATE POLICY "Public can view gallery posts" ON public.generated_posts
  FOR SELECT
  USING (is_public_gallery = true);
