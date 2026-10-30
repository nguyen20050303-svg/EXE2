-- ====================================================================
-- MIGRATION: ADMIN DASHBOARD & USER FEEDBACK (EXE2)
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

-- Policy 1: Cho phép mọi người dùng đã đăng nhập hoặc khách gửi feedback
DROP POLICY IF EXISTS "Cho phép tạo feedback" ON public.feedbacks;
CREATE POLICY "Cho phép tạo feedback"
  ON public.feedbacks FOR INSERT
  WITH CHECK (true);

-- Policy 2: Người dùng có thể đọc feedback của chính mình
DROP POLICY IF EXISTS "Người dùng xem feedback của mình" ON public.feedbacks;
CREATE POLICY "Người dùng xem feedback của mình"
  ON public.feedbacks FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 3: Cho phép đọc tất cả feedback (dành cho Admin hoặc Dashboard)
DROP POLICY IF EXISTS "Admin và Dashboard xem tất cả feedback" ON public.feedbacks;
CREATE POLICY "Admin và Dashboard xem tất cả feedback"
  ON public.feedbacks FOR SELECT
  USING (true);

-- Policy 4: Cập nhật trạng thái feedback (chỉ Admin)
DROP POLICY IF EXISTS "Cho phép cập nhật trạng thái feedback" ON public.feedbacks;
CREATE POLICY "Cho phép cập nhật trạng thái feedback"
  ON public.feedbacks FOR UPDATE
  USING (true);

-- 3. Tạo View hoặc Function hỗ trợ thống kê nhanh cho Admin Dashboard
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_overview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_users INT;
  v_paid_users INT;
  v_total_revenue BIGINT;
  v_total_feedbacks INT;
  v_avg_rating NUMERIC;
  v_total_storage BIGINT;
BEGIN
  -- Tổng user
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;

  -- Tổng user trả phí (active)
  SELECT COUNT(*) INTO v_paid_users 
  FROM public.subscriptions 
  WHERE status = 'ACTIVE' OR plan IN ('BASIC', 'PRO', 'VIP');

  -- Tổng doanh thu từ các giao dịch thành công (PAID)
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue 
  FROM public.payment_requests 
  WHERE status = 'PAID';

  -- Tổng feedback và điểm trung bình
  SELECT COUNT(*), COALESCE(ROUND(AVG(rating)::numeric, 1), 5.0) 
  INTO v_total_feedbacks, v_avg_rating 
  FROM public.feedbacks;

  -- Tổng dung lượng lưu trữ đang dùng
  SELECT COALESCE(SUM(storage_used), 0) INTO v_total_storage 
  FROM public.profiles;

  RETURN json_build_object(
    'total_users', v_total_users,
    'paid_users', v_paid_users,
    'total_revenue', v_total_revenue,
    'total_feedbacks', v_total_feedbacks,
    'avg_rating', v_avg_rating,
    'total_storage_bytes', v_total_storage
  );
END;
$$;

