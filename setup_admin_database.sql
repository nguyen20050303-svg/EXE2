-- ====================================================================
-- SCRIPT THIẾT LẬP BẢNG FEEDBACKS & PHÂN QUYỀN ADMIN (EXE2)
-- Copy toàn bộ nội dung dán vào Supabase SQL Editor và bấm RUN:
-- URL: https://supabase.com/dashboard/project/gkbeywmdajjencczncdv/sql/new
-- ====================================================================

-- 1. Bổ sung trường role cho bảng profiles (USER / ADMIN)
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN'));

-- 2. Tạo bảng lưu trữ Feedback từ người dùng
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL DEFAULT 'GENERAL' CHECK (category IN ('BUG', 'FEATURE', 'EXPERIENCE', 'PAYMENT', 'GENERAL')),
  title TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
  admin_notes TEXT,
  app_version TEXT DEFAULT '1.0.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bật Row Level Security cho bảng feedbacks
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Policy 1: Cho phép mọi người dùng gửi feedback
DROP POLICY IF EXISTS "Cho phép tạo feedback" ON public.feedbacks;
CREATE POLICY "Cho phép tạo feedback"
  ON public.feedbacks FOR INSERT
  WITH CHECK (true);

-- Policy 2: Cho phép đọc tất cả feedback (dành cho Web Admin Dashboard)
DROP POLICY IF EXISTS "Admin và Dashboard xem tất cả feedback" ON public.feedbacks;
CREATE POLICY "Admin và Dashboard xem tất cả feedback"
  ON public.feedbacks FOR SELECT
  USING (true);

-- Policy 3: Cho phép cập nhật trạng thái feedback (dành cho Admin trên Dashboard)
DROP POLICY IF EXISTS "Cho phép cập nhật trạng thái feedback" ON public.feedbacks;
CREATE POLICY "Cho phép cập nhật trạng thái feedback"
  ON public.feedbacks FOR UPDATE
  USING (true);

-- ====================================================================
-- THÔNG BÁO HOÀN TẤT
-- ====================================================================
SELECT 'Thiết lập bảng feedbacks & phân quyền Admin thành công!' AS result;

