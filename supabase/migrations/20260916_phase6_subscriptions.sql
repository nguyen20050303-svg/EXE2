-- ====================================================================
-- PHASE 6 MIGRATION: ENHANCED SUBSCRIPTIONS SCHEMA & RLS PROTECTION
-- ====================================================================

-- 1. Add extra tracking columns to public.subscriptions if they do not exist
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Strict RLS Policies on public.subscriptions
-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to ONLY SELECT their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Explicitly DISALLOW direct client INSERT or UPDATE
-- Only Service Role or SECURITY DEFINER RPCs can modify subscription records
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

-- 3. Secure RPC to update subscription after backend/provider verification (Service Role)
CREATE OR REPLACE FUNCTION public.server_update_subscription(
  p_user_id UUID,
  p_status TEXT,
  p_plan TEXT,
  p_provider TEXT,
  p_provider_subscription_id TEXT,
  p_current_period_start TIMESTAMPTZ,
  p_current_period_end TIMESTAMPTZ,
  p_cancel_at_period_end BOOLEAN DEFAULT FALSE
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  -- Verify caller is service_role or valid internal invocation
  IF auth.role() <> 'service_role' THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied: Requires service_role execution');
  END IF;

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
    RETURN json_build_object('success', false, 'error', 'Subscription record not found for user');
  END IF;

  RETURN json_build_object('success', true, 'subscription', row_to_json(v_sub));
END;
$$;
