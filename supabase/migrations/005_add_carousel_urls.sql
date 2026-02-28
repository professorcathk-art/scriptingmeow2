-- Add carousel_urls for multi-image carousel posts
ALTER TABLE public.generated_posts
ADD COLUMN IF NOT EXISTS carousel_urls TEXT[] DEFAULT '{}';
