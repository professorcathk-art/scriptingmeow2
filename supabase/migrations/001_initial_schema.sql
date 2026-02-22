-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'basic', 'pro')),
  credits_remaining INTEGER NOT NULL DEFAULT 10,
  credits_reset_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brand Spaces table
CREATE TABLE public.brand_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brand_type TEXT NOT NULL CHECK (brand_type IN ('personal-brand', 'shop', 'agency', 'local-business', 'other')),
  avatar_url TEXT,
  style_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brandbooks table
CREATE TABLE public.brandbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_space_id UUID NOT NULL REFERENCES public.brand_spaces(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  brand_type TEXT NOT NULL,
  target_audiences TEXT[] DEFAULT '{}',
  audience_pain_points TEXT[] DEFAULT '{}',
  desired_outcomes TEXT[] DEFAULT '{}',
  value_proposition TEXT NOT NULL,
  brand_personality TEXT NOT NULL,
  tone_of_voice TEXT NOT NULL,
  visual_style JSONB NOT NULL DEFAULT '{}',
  caption_structure JSONB NOT NULL DEFAULT '{}',
  dos_and_donts JSONB NOT NULL DEFAULT '{}',
  custom_rules TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(brand_space_id)
);

-- Brand reference images table
CREATE TABLE public.brand_reference_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_space_id UUID NOT NULL REFERENCES public.brand_spaces(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generated posts table
CREATE TABLE public.generated_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_space_id UUID NOT NULL REFERENCES public.brand_spaces(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL CHECK (post_type IN ('single-image', 'carousel')),
  format TEXT NOT NULL CHECK (format IN ('square', 'portrait', 'story', 'reel-cover', 'custom')),
  language TEXT NOT NULL,
  content_idea TEXT NOT NULL,
  visual_url TEXT,
  caption JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'saved')),
  tags TEXT[] DEFAULT '{}',
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Credit transactions table
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_brand_spaces_user_id ON public.brand_spaces(user_id);
CREATE INDEX idx_brandbooks_brand_space_id ON public.brandbooks(brand_space_id);
CREATE INDEX idx_brand_reference_images_brand_space_id ON public.brand_reference_images(brand_space_id);
CREATE INDEX idx_generated_posts_brand_space_id ON public.generated_posts(brand_space_id);
CREATE INDEX idx_generated_posts_status ON public.generated_posts(status);
CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brandbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_reference_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Brand Spaces policies
CREATE POLICY "Users can view own brand spaces" ON public.brand_spaces
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own brand spaces" ON public.brand_spaces
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brand spaces" ON public.brand_spaces
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brand spaces" ON public.brand_spaces
  FOR DELETE USING (auth.uid() = user_id);

-- Brandbooks policies
CREATE POLICY "Users can view own brandbooks" ON public.brandbooks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.brand_spaces
      WHERE brand_spaces.id = brandbooks.brand_space_id
      AND brand_spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own brandbooks" ON public.brandbooks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_spaces
      WHERE brand_spaces.id = brandbooks.brand_space_id
      AND brand_spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own brandbooks" ON public.brandbooks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.brand_spaces
      WHERE brand_spaces.id = brandbooks.brand_space_id
      AND brand_spaces.user_id = auth.uid()
    )
  );

-- Brand reference images policies
CREATE POLICY "Users can view own reference images" ON public.brand_reference_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.brand_spaces
      WHERE brand_spaces.id = brand_reference_images.brand_space_id
      AND brand_spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own reference images" ON public.brand_reference_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_spaces
      WHERE brand_spaces.id = brand_reference_images.brand_space_id
      AND brand_spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own reference images" ON public.brand_reference_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.brand_spaces
      WHERE brand_spaces.id = brand_reference_images.brand_space_id
      AND brand_spaces.user_id = auth.uid()
    )
  );

-- Generated posts policies
CREATE POLICY "Users can view own posts" ON public.generated_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.brand_spaces
      WHERE brand_spaces.id = generated_posts.brand_space_id
      AND brand_spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own posts" ON public.generated_posts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.brand_spaces
      WHERE brand_spaces.id = generated_posts.brand_space_id
      AND brand_spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own posts" ON public.generated_posts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.brand_spaces
      WHERE brand_spaces.id = generated_posts.brand_space_id
      AND brand_spaces.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own posts" ON public.generated_posts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.brand_spaces
      WHERE brand_spaces.id = generated_posts.brand_space_id
      AND brand_spaces.user_id = auth.uid()
    )
  );

-- Credit transactions policies
CREATE POLICY "Users can view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" ON public.credit_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, plan_tier, credits_remaining, credits_reset_date)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    10,
    NOW() + INTERVAL '1 month'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to reset credits monthly
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS void AS $$
DECLARE
  plan_limits RECORD;
BEGIN
  FOR plan_limits IN
    SELECT 
      u.id,
      u.plan_tier,
      CASE 
        WHEN u.plan_tier = 'free' THEN 10
        WHEN u.plan_tier = 'basic' THEN 100
        WHEN u.plan_tier = 'pro' THEN 500
        ELSE 10
      END as monthly_credits
    FROM public.users u
    WHERE u.credits_reset_date <= NOW()
  LOOP
    UPDATE public.users
    SET 
      credits_remaining = plan_limits.monthly_credits,
      credits_reset_date = NOW() + INTERVAL '1 month',
      updated_at = NOW()
    WHERE id = plan_limits.id;
    
    INSERT INTO public.credit_transactions (user_id, amount, description)
    VALUES (
      plan_limits.id,
      plan_limits.monthly_credits,
      'Monthly credit reset - ' || plan_limits.plan_tier || ' plan'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
