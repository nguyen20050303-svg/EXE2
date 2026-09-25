import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
const GA_DEBUG_ENDPOINT = 'https://www.google-analytics.com/debug/mp/collect';

export const GA_CONFIG = {
  firebaseAppId: '15835133782',
  apiSecret: 'l8rZ_4IkQPykpULaVYVfww',
};

const STORAGE_INSTANCE_ID_KEY = 'hidder.analytics.app_instance_id';

/**
 * Sinh chuỗi ngẫu nhiên 32 ký tự hex (chuẩn GA4 Mobile App Instance ID)
 */
const generate32HexId = () => {
  const chars = '0123456789abcdef';
  let res = '';
  for (let i = 0; i < 32; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
};

/**
 * Lấy hoặc khởi tạo định danh thiết bị ẩn danh (32 ký tự hex)
 */
export const getAppInstanceId = async () => {
  try {
    let instanceId = await AsyncStorage.getItem(STORAGE_INSTANCE_ID_KEY);
    if (!instanceId || instanceId.length !== 32) {
      instanceId = generate32HexId();
      await AsyncStorage.setItem(STORAGE_INSTANCE_ID_KEY, instanceId);
    }
    return instanceId;
  } catch {
    return generate32HexId();
  }
};

/**
 * Gửi sự kiện lên Google Analytics 4 (Measurement Protocol)
 * An toàn tuyệt đối: Không gửi thông tin nhạy cảm (PIN, mật khẩu, file)
 */
export const trackEvent = async (eventName, params = {}, isDebug = false) => {
  try {
    const instanceId = await getAppInstanceId();
    const endpoint = isDebug ? GA_DEBUG_ENDPOINT : GA_ENDPOINT;
    const url = `${endpoint}?api_secret=${GA_CONFIG.apiSecret}&firebase_app_id=${GA_CONFIG.firebaseAppId}`;

    // Chuẩn hóa tên sự kiện theo quy tắc GA4 (chữ thường, gạch dưới)
    const sanitizedEventName = eventName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);

    const safeParams = {
      platform: Platform.OS,
      timestamp: Date.now(),
      ...params,
    };

    const payload = {
      app_instance_id: instanceId,
      events: [
        {
          name: sanitizedEventName,
          params: safeParams,
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (isDebug) {
      const data = await response.json();
      console.log('[GA4 Debug]', data);
    }

    return response.ok;
  } catch (err) {
    // Analytics chạy ngầm, không bao giờ gây lỗi gián đoạn ứng dụng
    console.warn('[GA4 Analytics] Lỗi gửi sự kiện:', err.message);
    return false;
  }
};

// ====================================================================
// CÁC SỰ KIỆN ĐO LƯỜNG CHUẨN CỦA ỨNG DỤNG HIDDER
// ====================================================================

/** Mở ứng dụng */
export const logAppOpen = () => trackEvent('app_open');

/** Người dùng chuyển đổi lớp vỏ ngụy trang (Notes / Calculator / Weather / Calendar) */
export const logDisguiseChange = (disguiseType) =>
  trackEvent('change_disguise', { disguise_type: disguiseType });

/** Mở màn hình Mua thêm dung lượng */
export const logViewPricing = () => trackEvent('view_pricing_screen');

/** Chọn một gói dung lượng (Basic / Standard / Plus) */
export const logSelectPlan = (planId, priceValue) =>
  trackEvent('select_storage_plan', {
    plan_id: planId,
    price_vnd: priceValue,
  });

/** Bấm mở mã QR thanh toán VietQR */
export const logOpenVietQRPayment = (planId, priceValue) =>
  trackEvent('open_vietqr_payment', {
    plan_id: planId,
    price_vnd: priceValue,
  });

/** Bấm xác nhận đã chuyển khoản xong */
export const logConfirmTransfer = (planId, priceValue) =>
  trackEvent('confirm_bank_transfer', {
    plan_id: planId,
    price_vnd: priceValue,
  });

/** Hoàn tất cấu hình Setup Wizard lần đầu */
export const logSetupComplete = (disguiseType, biometricEnabled) =>
  trackEvent('setup_wizard_complete', {
    initial_disguise: disguiseType,
    biometric_enabled: Boolean(biometricEnabled),
  });
