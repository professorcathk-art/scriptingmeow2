-- Design Playground threads and items (thread/tile UI, auto-save history)
CREATE TABLE public.design_playground_threads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled design',
  prompt TEXT,
  dimension TEXT DEFAULT '1:1',
  brand_space_id UUID REFERENCES public.brand_spaces(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_design_playground_threads_user_id ON public.design_playground_threads(user_id);

ALTER TABLE public.design_playground_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own design threads" ON public.design_playground_threads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own design threads" ON public.design_playground_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own design threads" ON public.design_playground_threads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own design threads" ON public.design_playground_threads
  FOR DELETE USING (auth.uid() = user_id);

-- Design playground items (each generate/refine step in a thread)
CREATE TABLE public.design_playground_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id UUID NOT NULL REFERENCES public.design_playground_threads(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  step_index INTEGER NOT NULL DEFAULT 0,
  prompt TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_design_playground_items_thread_id ON public.design_playground_items(thread_id);

ALTER TABLE public.design_playground_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view design items via thread" ON public.design_playground_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.design_playground_threads t
      WHERE t.id = design_playground_items.thread_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create design items via thread" ON public.design_playground_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.design_playground_threads t
      WHERE t.id = design_playground_items.thread_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete design items via thread" ON public.design_playground_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.design_playground_threads t
      WHERE t.id = design_playground_items.thread_id AND t.user_id = auth.uid()
    )
  );

-- Library folders (e.g. "My design")
CREATE TABLE public.library_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_library_folders_user_id ON public.library_folders(user_id);

ALTER TABLE public.library_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own library folders" ON public.library_folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own library folders" ON public.library_folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own library folders" ON public.library_folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own library folders" ON public.library_folders
  FOR DELETE USING (auth.uid() = user_id);

-- Library items (design playground outputs, etc.)
CREATE TABLE public.library_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID NOT NULL REFERENCES public.library_folders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'design_playground' CHECK (source_type IN ('design_playground', 'post_refinement')),
  source_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_library_items_folder_id ON public.library_items(folder_id);
CREATE INDEX idx_library_items_user_id ON public.library_items(user_id);

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own library items" ON public.library_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own library items" ON public.library_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own library items" ON public.library_items
  FOR DELETE USING (auth.uid() = user_id);

-- Post refinement history (versions for Review Your Post)
CREATE TABLE public.post_refinement_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.generated_posts(id) ON DELETE CASCADE,
  version_index INTEGER NOT NULL DEFAULT 0,
  previous_visual_url TEXT,
  previous_carousel_urls TEXT[] DEFAULT '{}',
  visual_url TEXT,
  carousel_urls TEXT[] DEFAULT '{}',
  refined_page_index INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_post_refinement_history_post_id ON public.post_refinement_history(post_id);

ALTER TABLE public.post_refinement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view refinement history via post" ON public.post_refinement_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.generated_posts gp
      JOIN public.brand_spaces bs ON bs.id = gp.brand_space_id
      WHERE gp.id = post_refinement_history.post_id AND bs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create refinement history via post" ON public.post_refinement_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.generated_posts gp
      JOIN public.brand_spaces bs ON bs.id = gp.brand_space_id
      WHERE gp.id = post_refinement_history.post_id AND bs.user_id = auth.uid()
    )
  );
