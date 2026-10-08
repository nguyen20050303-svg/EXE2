-- Add PAYOS and VIETQR to allowed providers for subscriptions

ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_provider_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_provider_check CHECK (provider IN ('INTERNAL', 'GOOGLE_PLAY', 'APPLE', 'PAYOS', 'VIETQR'));
