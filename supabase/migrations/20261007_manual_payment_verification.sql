-- Manual VietQR payment verification flow.
-- The client can submit a pending request, but cannot activate a subscription.

CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  amount BIGINT NOT NULL CHECK (amount > 0),
  transfer_memo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'REJECTED')),
  provider TEXT NOT NULL DEFAULT 'VIETQR',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS payment_requests_user_status_idx
  ON public.payment_requests (user_id, status, created_at DESC);

ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment requests" ON public.payment_requests;
CREATE POLICY "Users can view own payment requests"
  ON public.payment_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.create_manual_payment_request(
  p_plan_id TEXT,
  p_amount BIGINT,
  p_transfer_memo TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_request
  FROM public.payment_requests
  WHERE user_id = v_user_id
    AND status = 'PENDING'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_request.id IS NOT NULL THEN
    RETURN json_build_object('success', true, 'status', 'PENDING', 'request', row_to_json(v_request));
  END IF;

  INSERT INTO public.payment_requests (user_id, plan_id, amount, transfer_memo)
  VALUES (v_user_id, p_plan_id, p_amount, p_transfer_memo)
  RETURNING * INTO v_request;

  RETURN json_build_object('success', true, 'status', 'PENDING', 'request', row_to_json(v_request));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_latest_payment_request()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  SELECT * INTO v_request
  FROM public.payment_requests
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'success', true,
    'status', COALESCE(v_request.status, 'NONE'),
    'request', CASE WHEN v_request.id IS NULL THEN NULL ELSE row_to_json(v_request) END
  );
END;
$$;
