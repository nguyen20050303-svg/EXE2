-- ====================================================================
-- PHASE 6: SYNC MASTER KEY ACROSS DEVICES
-- ====================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS master_key TEXT;
