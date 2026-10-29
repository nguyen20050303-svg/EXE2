-- ====================================================================
-- SCRIPT RESET DATABASE HIDDER (SUPABASE POSTGRESQL)
-- Cách dùng: Mở Supabase Dashboard -> SQL Editor -> Dán đoạn mã này và bấm RUN
-- URL: https://supabase.com/dashboard/project/gkbeywmdajjencczncdv/sql/new
-- ====================================================================

-- 1. Xóa sạch dữ liệu trong các bảng nghiệp vụ thuộc schema public
TRUNCATE TABLE public.files CASCADE;
TRUNCATE TABLE public.notes CASCADE;
TRUNCATE TABLE public.passwords CASCADE;
TRUNCATE TABLE public.payment_requests CASCADE;
TRUNCATE TABLE public.subscriptions CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- 2. Xóa toàn bộ tài khoản người dùng đăng ký (Auth Users)
-- LƯU Ý: Do các bảng đều có khóa ngoại liên kết tới auth.users(id) ON DELETE CASCADE,
-- câu lệnh bên dưới sẽ xóa sạch toàn bộ user và mọi dữ liệu liên quan.
DELETE FROM auth.users;

-- ====================================================================
-- THÔNG BÁO HOÀN TẤT
-- ====================================================================
SELECT 'Database đã được reset thành công!' AS result;

-- ====================================================================
-- LƯU Ý VỀ STORAGE (CÁC TỆP ĐÃ TẢI LÊN):
-- Supabase chặn xóa trực tiếp bằng SQL trên bảng storage.objects để tránh lỗi file mồ côi (orphaned files).
-- Để xóa các file trong bucket 'vault', vui lòng thực hiện trên giao diện Dashboard:
-- Vào mục 'Storage' -> Chọn bucket 'vault' -> Bấm 'Empty bucket' (hoặc chọn tất cả và nhấn Delete).
-- ====================================================================
