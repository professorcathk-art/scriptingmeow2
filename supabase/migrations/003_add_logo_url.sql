-- Add logo_url to brand_spaces for brand logo
ALTER TABLE public.brand_spaces
ADD COLUMN IF NOT EXISTS logo_url TEXT;
