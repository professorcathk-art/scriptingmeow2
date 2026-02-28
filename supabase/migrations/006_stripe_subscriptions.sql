-- Add Stripe columns to users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Update handle_new_user: free tier = 5 credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, plan_tier, credits_remaining, credits_reset_date)
  VALUES (
    NEW.id,
    NEW.email,
    'free',
    5,
    NOW() + INTERVAL '1 month'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reset_monthly_credits: free=5, basic=50, pro=200
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
        WHEN u.plan_tier = 'basic' THEN 50
        WHEN u.plan_tier = 'pro' THEN 200
        ELSE 5
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
