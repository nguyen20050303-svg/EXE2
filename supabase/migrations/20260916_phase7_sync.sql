-- ====================================================================
-- PHASE 7 MIGRATION: TWO-WAY SYNC & OFFLINE QUEUE DATA SCHEMA
-- ====================================================================

-- 1. Create or ensure public.notes table
CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private', 'decoy')),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was previously created
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes for efficient sync queries
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_type ON public.notes(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON public.notes(user_id, updated_at);

-- RLS for public.notes
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notes" ON public.notes;
CREATE POLICY "Users can view own notes"
  ON public.notes FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notes" ON public.notes;
CREATE POLICY "Users can insert own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notes" ON public.notes;
CREATE POLICY "Users can update own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notes" ON public.notes;
CREATE POLICY "Users can delete own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);


-- 2. Create or ensure public.passwords table
CREATE TABLE IF NOT EXISTS public.passwords (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  username TEXT DEFAULT '',
  password TEXT DEFAULT '',
  url TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  category TEXT DEFAULT 'general',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was previously created
ALTER TABLE public.passwords ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.passwords ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Indexes for passwords
CREATE INDEX IF NOT EXISTS idx_passwords_user_id ON public.passwords(user_id);
CREATE INDEX IF NOT EXISTS idx_passwords_updated_at ON public.passwords(user_id, updated_at);

-- RLS for public.passwords
ALTER TABLE public.passwords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own passwords" ON public.passwords;
CREATE POLICY "Users can view own passwords"
  ON public.passwords FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own passwords" ON public.passwords;
CREATE POLICY "Users can insert own passwords"
  ON public.passwords FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own passwords" ON public.passwords;
CREATE POLICY "Users can update own passwords"
  ON public.passwords FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own passwords" ON public.passwords;
CREATE POLICY "Users can delete own passwords"
  ON public.passwords FOR DELETE
  USING (auth.uid() = user_id);


-- 3. Enhance public.files table for sync
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_files_user_updated ON public.files(user_id, updated_at);


-- 4. Automatic updated_at trigger helper
CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notes_updated_at ON public.notes;
CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS trg_passwords_updated_at ON public.passwords;
CREATE TRIGGER trg_passwords_updated_at
  BEFORE UPDATE ON public.passwords
  FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();
