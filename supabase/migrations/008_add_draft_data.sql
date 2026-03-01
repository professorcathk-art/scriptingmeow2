-- Add draft_data to store visual advice, text on image, carousel pages for edit/regenerate
ALTER TABLE public.generated_posts
ADD COLUMN IF NOT EXISTS draft_data JSONB;
