import { Alert, Platform } from 'react-native';

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN');
};

export const confirmAction = ({ title, message, confirmText = 'Xác nhận', onConfirm }) => {
  if (Platform.OS === 'web') {
    const ok = typeof window !== 'undefined' ? window.confirm(`${title ? title + '\n\n' : ''}${message}`) : true;
    if (ok && onConfirm) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: 'Hủy', style: 'cancel' },
    { text: confirmText, style: 'destructive', onPress: onConfirm },
  ]);
};

export const generateId = () => {
  return Math.random().toString(36).substring(2, 9);
};

export const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const translateAuthError = (errorMsg) => {
  if (!errorMsg) return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
  const msg = String(errorMsg).toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid grant')) {
    return 'Email hoặc mật khẩu không chính xác.';
  }
  if (msg.includes('user already registered') || msg.includes('already registered')) {
    return 'Email này đã được đăng ký. Vui lòng chuyển sang Đăng nhập.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Email chưa được kích hoạt. Vui lòng kiểm tra hộp thư email của bạn để xác thực.';
  }
  if (msg.includes('password should be at least') || msg.includes('password is too short')) {
    return 'Mật khẩu phải có tối thiểu 6 ký tự.';
  }
  if (msg.includes('email rate limit exceeded')) {
    return 'Máy chủ Supabase đã chạm giới hạn gửi email (3 email/giờ). Vui lòng tắt "Confirm email" trong Supabase Dashboard để đăng ký ngay lập tức.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests')) {
    return 'Bạn đã thao tác quá nhiều lần. Vui lòng đợi trong giây lát rồi thử lại.';
  }
  if (msg.includes('network request failed') || msg.includes('failed to fetch') || msg.includes('timeout')) {
    return 'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
  }
  if (msg.includes('signup requires a valid password')) {
    return 'Vui lòng nhập mật khẩu hợp lệ.';
  }
  if (msg.includes('user not found')) {
    return 'Không tìm thấy tài khoản với email này.';
  }

  return errorMsg;
};
