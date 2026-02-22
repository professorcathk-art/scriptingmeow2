-- Add brand_details JSONB to brand_spaces for persisting form data
ALTER TABLE public.brand_spaces
ADD COLUMN IF NOT EXISTS brand_details JSONB DEFAULT NULL;
