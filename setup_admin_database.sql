-- ====================================================================
-- SCRIPT THIẾT LẬP BẢNG FEEDBACKS, QUYỀN ADMIN & GIÁM SÁT STORAGE (EXE2)
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

-- Cho phép gửi feedback
DROP POLICY IF EXISTS "Cho phép tạo feedback" ON public.feedbacks;
CREATE POLICY "Cho phép tạo feedback"
  ON public.feedbacks FOR INSERT
  WITH CHECK (true);

-- Cho phép đọc tất cả feedback (dành cho Web Admin Dashboard)
DROP POLICY IF EXISTS "Admin và Dashboard xem tất cả feedback" ON public.feedbacks;
CREATE POLICY "Admin và Dashboard xem tất cả feedback"
  ON public.feedbacks FOR SELECT
  USING (true);

-- Cho phép cập nhật trạng thái feedback (dành cho Admin trên Dashboard)
DROP POLICY IF EXISTS "Cho phép cập nhật trạng thái feedback" ON public.feedbacks;
CREATE POLICY "Admin và Dashboard cập nhật feedbacks"
  ON public.feedbacks FOR UPDATE
  USING (true);

-- ====================================================================
-- 3. CẤP QUYỀN TRUY XUẤT CHO WEB ADMIN DASHBOARD (PROFILES, SUBS, PAYMENTS, FILES)
-- ====================================================================

-- Cho phép Admin Dashboard xem danh sách tất cả Profiles người dùng
DROP POLICY IF EXISTS "Admin và Dashboard xem tất cả profiles" ON public.profiles;
CREATE POLICY "Admin và Dashboard xem tất cả profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Cho phép Admin Dashboard xem tất cả Subscriptions
DROP POLICY IF EXISTS "Admin và Dashboard xem tất cả subscriptions" ON public.subscriptions;
CREATE POLICY "Admin và Dashboard xem tất cả subscriptions"
  ON public.subscriptions FOR SELECT
  USING (true);

-- Cho phép Admin Dashboard cập nhật/kích hoạt Subscriptions khi duyệt đơn
DROP POLICY IF EXISTS "Admin và Dashboard quản lý subscriptions" ON public.subscriptions;
CREATE POLICY "Admin và Dashboard quản lý subscriptions"
  ON public.subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Cho phép Admin Dashboard xem tất cả Payment Requests
DROP POLICY IF EXISTS "Admin và Dashboard xem tất cả payment_requests" ON public.payment_requests;
CREATE POLICY "Admin và Dashboard xem tất cả payment_requests"
  ON public.payment_requests FOR SELECT
  USING (true);

-- Cho phép Admin Dashboard cập nhật/duyệt Payment Requests
DROP POLICY IF EXISTS "Admin và Dashboard cập nhật payment_requests" ON public.payment_requests;
CREATE POLICY "Admin và Dashboard cập nhật payment_requests"
  ON public.payment_requests FOR UPDATE
  USING (true);

-- Cho phép Admin Dashboard XEM, CẬP NHẬT và XÓA metadata tệp tin (Files) để dọn dẹp hàng đợi
DROP POLICY IF EXISTS "Admin và Dashboard xem tất cả files" ON public.files;
CREATE POLICY "Admin và Dashboard xem tất cả files"
  ON public.files FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin và Dashboard cập nhật files" ON public.files;
CREATE POLICY "Admin và Dashboard cập nhật files"
  ON public.files FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Admin và Dashboard xóa files" ON public.files;
CREATE POLICY "Admin và Dashboard xóa files"
  ON public.files FOR DELETE
  USING (true);

-- ====================================================================
-- 4. ĐẢM BẢO SUPABASE STORAGE BUCKET 'vault' HOẠT ĐỘNG KHÔNG BỊ LỖI
-- ====================================================================

-- Tạo bucket 'vault' riêng tư nếu chưa tồn tại
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault',
  'vault',
  false,
  1048576000, -- 1 GB max
  NULL
)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 1048576000;

-- Cấp quyền Storage Object cho người dùng đã đăng nhập vào thư mục users/[uid]/*
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
CREATE POLICY "Users can upload their own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'vault' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
CREATE POLICY "Users can view their own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'vault' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
CREATE POLICY "Users can update their own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'vault' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;
CREATE POLICY "Users can delete their own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'vault' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = 'users' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Cho phép Admin Dashboard xem và dọn dẹp Storage Object
DROP POLICY IF EXISTS "Admin xem tất cả storage objects" ON storage.objects;
CREATE POLICY "Admin xem tất cả storage objects"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vault');

DROP POLICY IF EXISTS "Admin xóa storage objects" ON storage.objects;
CREATE POLICY "Admin xóa storage objects"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vault');

-- ====================================================================
-- 5. FUNCTION DỌN DẸP CÁC FILE TREO DỞ DANG TRỰC TIẾP TRÊN DATABASE (RPC)
-- ====================================================================
CREATE OR REPLACE FUNCTION public.clean_stale_uploading_files(p_action TEXT DEFAULT 'DELETE')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  IF p_action = 'DELETE' THEN
    WITH deleted AS (
      DELETE FROM public.files 
      WHERE sync_status = 'UPLOADING'
      RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM deleted;
  ELSE
    WITH updated AS (
      UPDATE public.files 
      SET sync_status = 'ERROR', updated_at = NOW()
      WHERE sync_status = 'UPLOADING'
      RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM updated;
  END IF;

  RETURN json_build_object('success', true, 'count', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.clean_stale_uploading_files(TEXT) TO anon, authenticated, service_role;

-- Function xóa 1 file dở dang trực tiếp (bypasses RLS cho Admin)
CREATE OR REPLACE FUNCTION public.admin_delete_file(p_file_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $
DECLARE
  v_deleted INT := 0;
BEGIN
  DELETE FROM public.files WHERE id = p_file_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN json_build_object('success', true, 'deleted', v_deleted);
END;
$;

GRANT EXECUTE ON FUNCTION public.admin_delete_file(UUID) TO anon, authenticated, service_role;


-- ====================================================================
-- 6. TẠO FUNCTION RPC THỐNG KÊ TỔNG QUAN TỐC ĐỘ CAO CHO DASHBOARD
-- ====================================================================
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
  v_total_files INT;
  v_error_files INT;
BEGIN
  -- Tổng user từ profiles
  SELECT COUNT(*) INTO v_total_users FROM public.profiles;

  -- Tổng user trả phí (active các gói Basic, Standard, Premium, Plus)
  SELECT COUNT(*) INTO v_paid_users 
  FROM public.subscriptions 
  WHERE (status = 'ACTIVE' OR status = 'PAID')
    AND plan NOT IN ('FREE', 'FREE_256MB', 'FREE_TRIAL');

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

  -- Tổng files và files lỗi
  SELECT COUNT(*), COUNT(*) FILTER (WHERE sync_status = 'ERROR')
  INTO v_total_files, v_error_files
  FROM public.files;

  RETURN json_build_object(
    'total_users', v_total_users,
    'paid_users', v_paid_users,
    'total_revenue', v_total_revenue,
    'total_feedbacks', v_total_feedbacks,
    'avg_rating', v_avg_rating,
    'total_storage_bytes', v_total_storage,
    'total_files', v_total_files,
    'error_files', v_error_files
  );
END;
$$;

-- Cấp quyền thực thi RPC cho anon và authenticated
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_overview() TO anon, authenticated, service_role;

-- ====================================================================
-- THÔNG BÁO HOÀN TẤT
-- ====================================================================
SELECT 'Thiết lập quyền DELETE/UPDATE files cho Admin thành công!' AS result;
