-- Add logo_placement to brand_spaces for generated post layout
ALTER TABLE public.brand_spaces
ADD COLUMN IF NOT EXISTS logo_placement TEXT;
