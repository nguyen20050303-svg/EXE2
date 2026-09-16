-- ====================================================================
-- PHASE 2 MIGRATION: PROFILES & 30-DAY FREE TRIAL SUBSCRIPTIONS
-- ====================================================================

-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  storage_used BIGINT DEFAULT 0,
  storage_limit BIGINT DEFAULT 5368709120, -- 5GB default limit in bytes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies: Users can only read and update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 2. Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'FREE_TRIAL',
  status TEXT NOT NULL DEFAULT 'TRIAL' CHECK (status IN ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED')),
  trial_start_at TIMESTAMPTZ,
  trial_end_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  provider TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (provider IN ('INTERNAL', 'GOOGLE_PLAY', 'APPLE')),
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Subscriptions RLS policies:
-- Users can ONLY READ their own subscription.
-- Direct INSERT or UPDATE by client is DISALLOWED to prevent tampering.
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Automatic Trigger on user signup (auth.users)
-- Ensures every new account automatically gets a profile and 30-day Free Trial
CREATE OR REPLACE FUNCTION public.handle_new_user_setup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_trial_end TIMESTAMPTZ := NOW() + INTERVAL '30 days';
BEGIN
  -- Create profile if not exists
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_now, v_now)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = v_now;

  -- Create 30-day Free Trial subscription if not exists
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
    'FREE_TRIAL',
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_setup();

-- 4. Secure RPC function to create trial if needed (for existing users or client fallback)
CREATE OR REPLACE FUNCTION public.create_trial_if_needed()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_email TEXT;
  v_sub RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_trial_end TIMESTAMPTZ := NOW() + INTERVAL '30 days';
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Ensure profile exists
  SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (v_user_id, v_user_email, v_now, v_now)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = v_now;

  -- Check if subscription already exists for this user
  SELECT * INTO v_sub FROM public.subscriptions WHERE user_id = v_user_id;

  IF v_sub.id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'created', false,
      'subscription', row_to_json(v_sub)
    );
  END IF;

  -- Insert new 30-day Free Trial
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
    v_user_id,
    'FREE_TRIAL',
    'TRIAL',
    v_now,
    v_trial_end,
    v_now,
    v_trial_end,
    'INTERNAL',
    v_now,
    v_now
  )
  RETURNING * INTO v_sub;

  RETURN json_build_object(
    'success', true,
    'created', true,
    'subscription', row_to_json(v_sub)
  );
END;
$$;
