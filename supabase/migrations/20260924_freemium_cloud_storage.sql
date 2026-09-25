-- ====================================================================
-- MIGRATION: FREEMIUM CLOUD STORAGE MODEL
-- ====================================================================
-- 1. Free forever Local Storage (no subscription required).
-- 2. Every user receives 256 MB (268,435,456 bytes) of Free Cloud Storage.
-- 3. Paid Cloud Tiers:
--    - BASIC:    500 MB  (524,288,000 bytes)
--    - STANDARD: 1.5 GB  (1,610,612,736 bytes)
--    - PREMIUM:  5 GB    (5,368,709,120 bytes)
-- 4. Expiration/Downgrade: Files are NEVER deleted; uploads paused if over quota.
-- ====================================================================

-- 1. Update profiles table default storage limit to 256 MB (268,435,456 bytes)
ALTER TABLE public.profiles 
ALTER COLUMN storage_limit SET DEFAULT 268435456;

-- Update existing profiles that are on default or null to 256 MB minimum
UPDATE public.profiles
SET storage_limit = 268435456
WHERE storage_limit IS NULL OR storage_limit = 5368709120;

-- 2. Update default subscription plan to FREE
ALTER TABLE public.subscriptions 
ALTER COLUMN plan SET DEFAULT 'FREE';

ALTER TABLE public.subscriptions 
ALTER COLUMN status SET DEFAULT 'ACTIVE';

-- 3. Automatic Trigger on user signup (auth.users)
-- Ensures every new account receives 256 MB Free Cloud Storage that never expires
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  c_free_limit BIGINT := 268435456; -- 256 MB in bytes
BEGIN
  -- Create profile with 256 MB free cloud storage
  INSERT INTO public.profiles (id, email, storage_used, storage_limit, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 0, c_free_limit, v_now, v_now)
  ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email, 
        updated_at = v_now;

  -- Create Free Tier subscription (never expires)
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
    'ACTIVE',
    NULL,
    NULL,
    v_now,
    NULL, -- NULL means free plan never expires
    'INTERNAL',
    v_now,
    v_now
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- 4. Server-side quota check function
-- Evaluates authoritative usage against active entitlement.
-- If paid subscription is expired, gracefully downgrades effective limit to Free (256 MB).
CREATE OR REPLACE FUNCTION public.check_storage_quota(p_file_size BIGINT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_used BIGINT;
  v_limit BIGINT;
  v_effective_limit BIGINT;
  v_sub RECORD;
  v_now TIMESTAMPTZ := NOW();
  c_free_limit BIGINT := 268435456; -- 256 MB
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('allowed', false, 'error', 'Unauthorized');
  END IF;

  -- Fetch current storage used from profile
  SELECT COALESCE(storage_used, 0), COALESCE(storage_limit, c_free_limit)
  INTO v_used, v_limit
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('allowed', false, 'error', 'Profile not found');
  END IF;

  -- Check subscription status for authoritative entitlement
  SELECT * INTO v_sub FROM public.subscriptions WHERE user_id = v_user_id;

  v_effective_limit := v_limit;

  -- If subscription exists and is a paid plan that has expired, fallback to Free 256 MB
  IF v_sub.id IS NOT NULL AND v_sub.plan <> 'FREE' THEN
    IF v_sub.status = 'EXPIRED' OR (v_sub.current_period_end IS NOT NULL AND v_now >= v_sub.current_period_end) THEN
      v_effective_limit := c_free_limit;
    END IF;
  END IF;

  -- Verify quota
  IF (v_used + p_file_size) > v_effective_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'error', 'Storage quota exceeded (Dung lượng lưu trữ đám mây đã đầy)',
      'storage_used', v_used,
      'storage_limit', v_effective_limit,
      'remaining_bytes', GREATEST(0, v_effective_limit - v_used),
      'required_bytes', p_file_size,
      'is_full', true
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'storage_used', v_used,
    'storage_limit', v_effective_limit,
    'remaining_bytes', v_effective_limit - (v_used + p_file_size),
    'is_full', false
  );
END;
$$;

-- 5. Enhanced server_update_subscription RPC
-- Updates subscription and automatically syncs storage_limit in profiles table
CREATE OR REPLACE FUNCTION public.server_update_subscription(
  p_user_id UUID,
  p_status TEXT,
  p_plan TEXT,
  p_provider TEXT,
  p_provider_subscription_id TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN DEFAULT FALSE,
  p_storage_limit BIGINT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_new_limit BIGINT;
BEGIN
  -- Determine storage limit based on plan if not explicitly passed
  IF p_storage_limit IS NOT NULL AND p_storage_limit > 0 THEN
    v_new_limit := p_storage_limit;
  ELSE
    CASE UPPER(p_plan)
      WHEN 'BASIC_500MB' THEN v_new_limit := 524288000;       -- 500 MB
      WHEN 'STANDARD_1_5GB' THEN v_new_limit := 1610612736;   -- 1.5 GB
      WHEN 'PREMIUM_5GB' THEN v_new_limit := 5368709120;      -- 5 GB
      WHEN 'PLUS_5GB' THEN v_new_limit := 5368709120;         -- 5 GB (legacy alias)
      ELSE v_new_limit := 268435456;                         -- 256 MB Free
    END CASE;
  END IF;

  -- Update subscription record
  UPDATE public.subscriptions
  SET
    status = p_status,
    plan = p_plan,
    provider = p_provider,
    provider_subscription_id = p_provider_subscription_id,
    current_period_start = p_current_period_start,
    current_period_end = p_current_period_end,
    cancel_at_period_end = p_cancel_at_period_end,
    last_verified_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_sub;

  IF NOT FOUND THEN
    INSERT INTO public.subscriptions (
      user_id, plan, status, provider, provider_subscription_id,
      current_period_start, current_period_end, cancel_at_period_end,
      last_verified_at, created_at, updated_at
    )
    VALUES (
      p_user_id, p_plan, p_status, p_provider, p_provider_subscription_id,
      p_current_period_start, p_current_period_end, p_cancel_at_period_end,
      NOW(), NOW(), NOW()
    )
    RETURNING * INTO v_sub;
  END IF;

  -- Update profiles.storage_limit
  UPDATE public.profiles
  SET storage_limit = v_new_limit, updated_at = NOW()
  WHERE id = p_user_id;

  RETURN json_build_object(
    'success', true,
    'subscription', row_to_json(v_sub),
    'storage_limit', v_new_limit
  );
END;
$$;
