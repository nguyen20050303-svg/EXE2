-- Migration to add time extension logic for subscription upgrades
-- If a user upgrades or renews while their plan is still ACTIVE, the new time is added to their existing remaining time.

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
  v_existing_sub RECORD;
  v_computed_start TIMESTAMPTZ;
  v_computed_end TIMESTAMPTZ;
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

  -- Logic: Time extension (Cộng dồn thời hạn)
  v_computed_start := p_current_period_start;
  v_computed_end := p_current_period_end;

  SELECT * INTO v_existing_sub FROM public.subscriptions WHERE user_id = p_user_id;

  IF FOUND THEN
    -- If they have an ACTIVE plan, and it expires in the future, extend the duration
    IF (v_existing_sub.status = 'ACTIVE' OR v_existing_sub.status = 'TRIAL') AND v_existing_sub.current_period_end > NOW() THEN
      -- Extend the existing end date by the new duration (e.g. 30 days)
      v_computed_end := v_existing_sub.current_period_end + (p_current_period_end - p_current_period_start);
      -- Keep the original start date to show when they started the active streak
      v_computed_start := v_existing_sub.current_period_start;
    END IF;
  END IF;

  -- Update subscription record
  UPDATE public.subscriptions
  SET
    status = p_status,
    plan = p_plan,
    provider = p_provider,
    provider_subscription_id = p_provider_subscription_id,
    current_period_start = v_computed_start,
    current_period_end = v_computed_end,
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
      v_computed_start, v_computed_end, p_cancel_at_period_end,
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
