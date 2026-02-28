-- Expand brand_type to support new options
-- 1. Drop old constraint
ALTER TABLE public.brand_spaces DROP CONSTRAINT IF EXISTS brand_spaces_brand_type_check;

-- 2. Migrate existing values before adding new constraint
UPDATE public.brand_spaces SET brand_type = 'ecommerce-retail' WHERE brand_type = 'shop';
UPDATE public.brand_spaces SET brand_type = 'service-agency' WHERE brand_type = 'agency';

-- 3. Add new constraint
ALTER TABLE public.brand_spaces ADD CONSTRAINT brand_spaces_brand_type_check CHECK (brand_type IN (
  'personal-brand',
  'ecommerce-retail',
  'service-agency',
  'local-business',
  'tech-startup',
  'community-nonprofit',
  'other'
));
