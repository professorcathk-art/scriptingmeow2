-- Scope Idea Bank and RSS feeds to a Brand Space (per-brand organization)

ALTER TABLE public.user_post_ideas
  ADD COLUMN IF NOT EXISTS brand_space_id UUID REFERENCES public.brand_spaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_post_ideas_brand_space_id ON public.user_post_ideas(brand_space_id);

-- Allow selecting ideas for the same user across their brand spaces (RLS still user_id)
COMMENT ON COLUMN public.user_post_ideas.brand_space_id IS 'Brand this idea belongs to; required for new rows.';

ALTER TABLE public.user_rss_feeds
  ADD COLUMN IF NOT EXISTS brand_space_id UUID REFERENCES public.brand_spaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_rss_feeds_brand_space_id ON public.user_rss_feeds(brand_space_id);

-- Backfill: attach existing rows to user's first brand space where null
UPDATE public.user_post_ideas u
SET brand_space_id = (
  SELECT b.id FROM public.brand_spaces b WHERE b.user_id = u.user_id ORDER BY b.created_at ASC LIMIT 1
)
WHERE u.brand_space_id IS NULL;

UPDATE public.user_rss_feeds f
SET brand_space_id = (
  SELECT b.id FROM public.brand_spaces b WHERE b.user_id = f.user_id ORDER BY b.created_at ASC LIMIT 1
)
WHERE f.brand_space_id IS NULL;
