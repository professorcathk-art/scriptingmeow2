-- RSS Autofeed (paid users only)
CREATE TABLE public.user_rss_feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rss_url TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_fetched_at TIMESTAMPTZ
);

CREATE INDEX idx_user_rss_feeds_user_id ON public.user_rss_feeds(user_id);

ALTER TABLE public.user_rss_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rss feeds" ON public.user_rss_feeds
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own rss feeds" ON public.user_rss_feeds
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rss feeds" ON public.user_rss_feeds
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.user_rss_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rss_feed_id UUID NOT NULL REFERENCES public.user_rss_feeds(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title TEXT,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_rss_ideas_user_id ON public.user_rss_ideas(user_id);
CREATE INDEX idx_user_rss_ideas_feed_id ON public.user_rss_ideas(rss_feed_id);

ALTER TABLE public.user_rss_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rss ideas" ON public.user_rss_ideas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own rss ideas" ON public.user_rss_ideas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own rss ideas" ON public.user_rss_ideas
  FOR DELETE USING (auth.uid() = user_id);

-- Post templates (save style for reuse)
CREATE TABLE public.post_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand_space_id UUID NOT NULL REFERENCES public.brand_spaces(id) ON DELETE CASCADE,
  content_framework TEXT NOT NULL DEFAULT 'educational-value',
  post_style TEXT NOT NULL DEFAULT 'immersive-photo',
  post_type TEXT NOT NULL DEFAULT 'single-image',
  format TEXT NOT NULL DEFAULT 'square',
  custom_width INTEGER,
  custom_height INTEGER,
  carousel_page_count INTEGER DEFAULT 3,
  carousel_pages JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_post_templates_user_id ON public.post_templates(user_id);

ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON public.post_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates" ON public.post_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON public.post_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON public.post_templates
  FOR DELETE USING (auth.uid() = user_id);
