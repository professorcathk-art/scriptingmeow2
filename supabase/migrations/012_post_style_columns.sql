-- Add style columns to generated_posts for template saving
ALTER TABLE public.generated_posts
  ADD COLUMN IF NOT EXISTS content_framework TEXT DEFAULT 'educational-value',
  ADD COLUMN IF NOT EXISTS post_style TEXT DEFAULT 'immersive-photo',
  ADD COLUMN IF NOT EXISTS custom_width INTEGER,
  ADD COLUMN IF NOT EXISTS custom_height INTEGER,
  ADD COLUMN IF NOT EXISTS carousel_page_count INTEGER,
  ADD COLUMN IF NOT EXISTS carousel_pages JSONB;
