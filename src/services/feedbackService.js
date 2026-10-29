import { supabase } from './supabase';

/**
 * Gửi phản hồi / góp ý từ người dùng lên Supabase
 * @param {Object} param0
 * @param {string} param0.userId - ID người dùng (nếu có)
 * @param {string} param0.email - Email người dùng
 * @param {number} param0.rating - Đánh giá sao (1-5)
 * @param {string} param0.category - 'BUG' | 'FEATURE' | 'EXPERIENCE' | 'GENERAL'
 * @param {string} param0.title - Tiêu đề phản hồi
 * @param {string} param0.content - Nội dung phản hồi
 * @param {string} param0.appVersion - Phiên bản app
 */
export const submitUserFeedback = async ({
  userId = null,
  email = '',
  rating = 5,
  category = 'GENERAL',
  title = '',
  content = '',
  appVersion = '1.0.0',
}) => {
  if (!content || !content.trim()) {
    return { success: false, error: 'Vui lòng nhập nội dung phản hồi.' };
  }

  try {
    const payload = {
      user_id: userId || null,
      user_email: email || 'Ẩn danh',
      rating: Math.min(5, Math.max(1, Number(rating) || 5)),
      category: category || 'GENERAL',
      title: title ? title.trim() : 'Góp ý từ người dùng',
      content: content.trim(),
      status: 'NEW',
      app_version: appVersion,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('feedbacks').insert(payload).select().single();

    if (error) {
      console.warn('Lỗi gửi feedback lên Supabase:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, feedback: data };
  } catch (err) {
    console.warn('Exception khi gửi feedback:', err.message);
    return { success: false, error: err.message };
  }
};

