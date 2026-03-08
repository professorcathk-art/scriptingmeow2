-- Add four_k_credits to users (4K upgrade quota per month)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS four_k_credits INTEGER NOT NULL DEFAULT 0;

-- Drop old plan_tier constraint, migrate data, add new constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_tier_check;
UPDATE public.users SET plan_tier = 'starter', four_k_credits = 2 WHERE plan_tier = 'basic';
UPDATE public.users SET plan_tier = 'creator', four_k_credits = 5 WHERE plan_tier = 'pro';
ALTER TABLE public.users ADD CONSTRAINT users_plan_tier_check
  CHECK (plan_tier IN ('free', 'starter', 'creator'));

-- Update handle_new_user: free = 5 credits, 0 4K
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, plan_tier, credits_remaining, four_k_credits, credits_reset_date)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    5,
    0,
    NOW() + INTERVAL '1 month'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reset_monthly_credits: free=5/0, starter=20/2, creator=50/5
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
        WHEN u.plan_tier = 'free' THEN 5
        WHEN u.plan_tier = 'starter' THEN 20
        WHEN u.plan_tier = 'creator' THEN 50
        ELSE 5
      END as monthly_credits,
      CASE 
        WHEN u.plan_tier = 'free' THEN 0
        WHEN u.plan_tier = 'starter' THEN 2
        WHEN u.plan_tier = 'creator' THEN 5
        ELSE 0
      END as four_k_credits
    FROM public.users u
    WHERE u.credits_reset_date <= NOW()
  LOOP
    UPDATE public.users
    SET 
      credits_remaining = plan_limits.monthly_credits,
      four_k_credits = plan_limits.four_k_credits,
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
