-- ====================================================================
-- PHASE 4 MIGRATION: FILE METADATA & STORAGE QUOTA ENFORCEMENT
-- ====================================================================

-- 1. Create files metadata table
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('PHOTO', 'VIDEO', 'DOCUMENT', 'VOICE', 'OTHER')),
  sync_status TEXT NOT NULL DEFAULT 'LOCAL' CHECK (sync_status IN ('LOCAL', 'UPLOADING', 'CLOUD', 'ERROR', 'DELETED')),
  encryption_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_category ON public.files(user_id, category);
CREATE INDEX IF NOT EXISTS idx_files_sync_status ON public.files(user_id, sync_status);

-- 2. Row Level Security (RLS)
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT their own files
DROP POLICY IF EXISTS "Users can view own files" ON public.files;
CREATE POLICY "Users can view own files"
  ON public.files FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only INSERT metadata for their own files
DROP POLICY IF EXISTS "Users can insert own files" ON public.files;
CREATE POLICY "Users can insert own files"
  ON public.files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only UPDATE their own files (cannot change user_id)
DROP POLICY IF EXISTS "Users can update own files" ON public.files;
CREATE POLICY "Users can update own files"
  ON public.files FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only DELETE their own files
DROP POLICY IF EXISTS "Users can delete own files" ON public.files;
CREATE POLICY "Users can delete own files"
  ON public.files FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Function to verify storage quota before upload
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
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('allowed', false, 'error', 'Unauthorized');
  END IF;

  SELECT COALESCE(storage_used, 0), COALESCE(storage_limit, 5368709120)
  INTO v_used, v_limit
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('allowed', false, 'error', 'Profile not found');
  END IF;

  IF (v_used + p_file_size) > v_limit THEN
    RETURN json_build_object(
      'allowed', false,
      'error', 'Storage quota exceeded',
      'storage_used', v_used,
      'storage_limit', v_limit,
      'required', p_file_size
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'storage_used', v_used,
    'storage_limit', v_limit
  );
END;
$$;

-- 4. Trigger to automatically keep profiles.storage_used accurate
CREATE OR REPLACE FUNCTION public.sync_profile_storage_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_total_bytes BIGINT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
  ELSE
    v_user_id := NEW.user_id;
  END IF;

  -- Sum size of all CLOUD active files for this user
  SELECT COALESCE(SUM(size_bytes), 0)
  INTO v_total_bytes
  FROM public.files
  WHERE user_id = v_user_id AND sync_status = 'CLOUD';

  UPDATE public.profiles
  SET storage_used = v_total_bytes, updated_at = NOW()
  WHERE id = v_user_id;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_files_storage ON public.files;
CREATE TRIGGER trg_sync_files_storage
  AFTER INSERT OR UPDATE OF sync_status, size_bytes OR DELETE ON public.files
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_storage_usage();
