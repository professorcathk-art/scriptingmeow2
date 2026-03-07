-- User saved references (e.g. from landing style gallery)
CREATE TABLE public.user_saved_references (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'landing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_saved_references_user_id ON public.user_saved_references(user_id);

ALTER TABLE public.user_saved_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved references" ON public.user_saved_references
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved references" ON public.user_saved_references
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved references" ON public.user_saved_references
  FOR DELETE USING (auth.uid() = user_id);

-- User post ideas (Idea Bank / 素材庫)
CREATE TABLE public.user_post_ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_post_ideas_user_id ON public.user_post_ideas(user_id);

ALTER TABLE public.user_post_ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own post ideas" ON public.user_post_ideas
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own post ideas" ON public.user_post_ideas
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own post ideas" ON public.user_post_ideas
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own post ideas" ON public.user_post_ideas
  FOR DELETE USING (auth.uid() = user_id);
