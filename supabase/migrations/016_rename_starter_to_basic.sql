-- Rename starter back to basic (pricing: Basic $9.9, Creator $19.9)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_tier_check;
UPDATE public.users SET plan_tier = 'basic' WHERE plan_tier = 'starter';
ALTER TABLE public.users ADD CONSTRAINT users_plan_tier_check
  CHECK (plan_tier IN ('free', 'basic', 'creator'));

-- Update reset_monthly_credits to use 'basic' instead of 'starter'
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
        WHEN u.plan_tier = 'basic' THEN 20
        WHEN u.plan_tier = 'creator' THEN 50
        ELSE 5
      END as monthly_credits,
      CASE 
        WHEN u.plan_tier = 'free' THEN 0
        WHEN u.plan_tier = 'basic' THEN 2
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
