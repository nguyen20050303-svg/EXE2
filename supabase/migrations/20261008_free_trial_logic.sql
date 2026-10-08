-- ====================================================================
-- MIGRATION: FREE TRIAL - 30 DAYS (FREEMIUM MODEL UPDATE)
-- ====================================================================
-- 1. New users get 30 days of TRIAL to access all premium features.
-- 2. After 30 days, if not upgraded, features are locked (Sync, Vaults, Disguise).
-- 3. Storage is maintained at 256 MB.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_trial_end TIMESTAMPTZ := v_now + INTERVAL '30 days';
  c_free_limit BIGINT := 268435456; -- 256 MB in bytes
BEGIN
  -- Create profile with 256 MB free cloud storage
  INSERT INTO public.profiles (id, email, storage_used, storage_limit, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 0, c_free_limit, v_now, v_now)
  ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email, 
        updated_at = v_now;

  -- Create Trial subscription (30 days)
  INSERT INTO public.subscriptions (
    user_id,
    plan,
    status,
    trial_start_at,
    trial_end_at,
    current_period_start,
    current_period_end,
    provider,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'FREE',
    'TRIAL',
    v_now,
    v_trial_end,
    v_now,
    v_trial_end,
    'INTERNAL',
    v_now,
    v_now
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Optionally, upgrade all existing users who have 'FREE' and 'ACTIVE' status 
-- to 'TRIAL' starting from their created_at date to enforce the 30-day trial logically.
UPDATE public.subscriptions
SET 
  status = 'TRIAL',
  trial_start_at = created_at,
  trial_end_at = created_at + INTERVAL '30 days',
  current_period_start = created_at,
  current_period_end = created_at + INTERVAL '30 days'
WHERE plan = 'FREE' AND status = 'ACTIVE' AND trial_end_at IS NULL;
