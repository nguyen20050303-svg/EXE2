import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, supabase } from './supabase.js';

export const SUBSCRIPTION_STATUS = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};

export const STORAGE_PLANS = [
  {
    id: 'FREE_256MB',
    name: 'Free · 256 MB',
    storageLabel: '256 MB',
    storageBytes: 256 * 1024 * 1024, // 268,435,456 bytes
    description: 'Miễn phí trọn đời cho mọi tài khoản vừa đăng ký.',
    priceText: '0đ/tháng',
    priceValue: 0,
    isFree: true,
  },
  {
    id: 'BASIC_500MB',
    name: 'Basic · 500 MB',
    storageLabel: '500 MB',
    storageBytes: 500 * 1024 * 1024, // 524,288,000 bytes
    description: 'Phù hợp để lưu ảnh và ghi chú riêng tư cơ bản.',
    priceText: '12k/tháng',
    priceValue: 12000,
  },
  {
    id: 'STANDARD_1_5GB',
    name: 'Standard · 1.5 GB',
    storageLabel: '1.5 GB',
    storageBytes: 1536 * 1024 * 1024, // 1,610,612,736 bytes
    description: 'Dung lượng vừa cho ảnh, video ngắn và tài liệu.',
    priceText: '32k/tháng',
    priceValue: 32000,
  },
  {
    id: 'PREMIUM_5GB',
    name: 'Premium · 5 GB',
    storageLabel: '5 GB',
    storageBytes: 5120 * 1024 * 1024, // 5,368,709,120 bytes
    description: 'Dung lượng lớn hơn cho nhiều file cá nhân.',
    priceText: '52k/tháng',
    priceValue: 52000,
    aliasId: 'PLUS_5GB',
  },
];

export const getPlanById = (planId) => {
  if (!planId) return STORAGE_PLANS[0];
  const normalized = String(planId).toUpperCase();
  if (normalized === 'PLUS_5GB' || normalized.includes('5GB') || normalized.includes('PREMIUM')) {
    return STORAGE_PLANS[3];
  }
  if (normalized.includes('1_5GB') || normalized.includes('STANDARD')) {
    return STORAGE_PLANS[2];
  }
  if (normalized.includes('500MB') || normalized.includes('BASIC')) {
    return STORAGE_PLANS[1];
  }
  return STORAGE_PLANS[0]; // Free
};

/**
 * Cấu hình thông tin tài khoản ngân hàng nhận tiền chuyển khoản (VietQR)
 * Bạn có thể thay đổi số tài khoản, tên ngân hàng và chủ tài khoản tại đây.
 */
export const BANK_CONFIG = {
  bankId: 'MB', // Mã ngân hàng: MB, VCB, TCB, VPB, ACB, TPB, BIDV, CTG, VIB, STB...
  bankName: 'MBBank (Ngân Hàng Quân Đội)',
  accountNo: '0352410259', // <-- THAY SỐ TÀI KHOẢN CỦA BẠN VÀO ĐÂY
  accountName: 'CHỦ TÀI KHOẢN HIDDER', // <-- THAY TÊN CHỦ TÀI KHOẢN VÀO ĐÂY
};

/**
 * Tạo link hình ảnh mã VietQR tự động qua chuẩn Napas VietQR
 */
export const getVietQRUrl = ({
  bankId = BANK_CONFIG.bankId,
  accountNo = BANK_CONFIG.accountNo,
  accountName = BANK_CONFIG.accountName,
  amount = 32000,
  memo = 'HIDDER VAULT',
} = {}) => {
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    memo
  )}&accountName=${encodeURIComponent(accountName)}`;
};

export const VERIFY_SUBSCRIPTION_URL = `${SUPABASE_URL}/functions/v1/verify-subscription`;

const getSubCacheKey = (userId) => `hidder.cached-subscription.${userId}`;

export const getCachedSubscription = async (userId) => {
  if (!userId) return null;
  try {
    const raw = await AsyncStorage.getItem(getSubCacheKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCachedSubscription = async (userId, data) => {
  if (!userId || !data) return;
  try {
    await AsyncStorage.setItem(getSubCacheKey(userId), JSON.stringify(data));
  } catch { }
};

/**
 * Fetch subscription record from Supabase database (with offline cache fallback)
 */
export const fetchSubscription = async (userId) => {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      void setCachedSubscription(userId, data);
      return data;
    }

    if (error) {
      console.warn('Lỗi truy vấn subscription từ Supabase, thử nạp từ cache:', error.message);
      return await getCachedSubscription(userId);
    }

    // If no error but data is null (no record in DB)
    return null;
  } catch (err) {
    console.warn('Lỗi mạng khi tải subscription (offline fallback):', err.message);
    return await getCachedSubscription(userId);
  }
};

export const getSubscription = fetchSubscription;

/**
 * Get status string from subscription record
 */
export const getSubscriptionStatus = (subscription) => subscription?.status || SUBSCRIPTION_STATUS.ACTIVE;

/**
 * Check if evaluated access allows entry to Vault (Always true in Freemium: local vault is free forever)
 */
export const isSubscriptionValid = (access) => Boolean(access?.valid ?? true);

/**
 * Calculate remaining trial days from database timestamp
 */
export const getRemainingTrialDays = (subscription) => {
  if (!subscription?.trial_end_at) return 0;
  const now = new Date();
  const trialEnd = new Date(subscription.trial_end_at);
  if (now >= trialEnd) return 0;
  const diffMs = trialEnd.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

/**
 * Creates Free 256MB subscription via secure server RPC if not already created
 */
export const createTrialIfNeeded = async () => {
  try {
    const { data, error } = await supabase.rpc('create_trial_if_needed');

    if (error) {
      console.warn('Lỗi gọi RPC create_trial_if_needed:', error.message);
      return null;
    }

    if (data?.success && data?.subscription) {
      return data.subscription;
    }

    return null;
  } catch (err) {
    console.warn('Lỗi kết nối RPC tạo trial:', err.message);
    return null;
  }
};

/**
 * Evaluates access validity strictly based on database subscription timestamps
 * Freemium Model:
 * - Local storage is ALWAYS valid (free forever).
 * - Free Cloud storage (256 MB) never expires.
 * - Expired paid plans downgrade to Free (256 MB) without file deletion.
 */
export const evaluateAccess = (subscription, storageUsed = 0) => {
  const c_free_limit = 256 * 1024 * 1024; // 268,435,456 bytes

  // 1. No subscription record or FREE plan: Valid forever at 256 MB Free tier
  if (!subscription || subscription.plan === 'FREE' || !subscription.plan) {
    return {
      valid: true,
      localValid: true,
      status: SUBSCRIPTION_STATUS.ACTIVE,
      plan: 'Free · 256 MB',
      planId: 'FREE_256MB',
      storageLimit: c_free_limit,
      remainingDays: null,
      expirationDate: 'Vĩnh viễn',
      isPaid: false,
      isDowngraded: false,
      canUpload: storageUsed < c_free_limit,
      overQuota: storageUsed > c_free_limit,
      reason: 'FREE_TIER_ACTIVE',
    };
  }

  const now = new Date();
  const planInfo = getPlanById(subscription.plan_id || subscription.plan);

  // 2. TRIAL Evaluation (Legacy or promotion trials)
  if (subscription.status === SUBSCRIPTION_STATUS.TRIAL) {
    if (subscription.trial_end_at) {
      const trialEnd = new Date(subscription.trial_end_at);
      if (now < trialEnd) {
        const diffMs = trialEnd.getTime() - now.getTime();
        const remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        return {
          valid: true,
          localValid: true,
          status: SUBSCRIPTION_STATUS.TRIAL,
          plan: subscription.plan || 'Free Trial 30 Ngày',
          planId: planInfo.id,
          storageLimit: planInfo.storageBytes,
          remainingDays,
          expirationDate: trialEnd.toLocaleDateString('vi-VN'),
          isPaid: false,
          isDowngraded: false,
          canUpload: storageUsed < planInfo.storageBytes,
          overQuota: storageUsed > planInfo.storageBytes,
          reason: 'TRIAL_ACTIVE',
        };
      }
    }

    // Trial expired -> Gracefully downgrade to Free 256 MB instead of blocking
    return {
      valid: true,
      localValid: true,
      status: 'DOWNGRADED_FREE',
      plan: 'Free · 256 MB',
      planId: 'FREE_256MB',
      storageLimit: c_free_limit,
      remainingDays: 0,
      expirationDate: 'Dùng thử đã kết thúc (Về gói Miễn Phí)',
      isPaid: false,
      isDowngraded: true,
      canUpload: storageUsed < c_free_limit,
      overQuota: storageUsed > c_free_limit,
      reason: 'TRIAL_EXPIRED_DOWNGRADED_TO_FREE',
    };
  }

  // 3. ACTIVE Paid Plan Evaluation
  if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
    if (!subscription.current_period_end) {
      // No period end means permanent or free
      return {
        valid: true,
        localValid: true,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        plan: planInfo.name,
        planId: planInfo.id,
        storageLimit: planInfo.storageBytes,
        remainingDays: null,
        expirationDate: 'Vĩnh viễn',
        isPaid: planInfo.priceValue > 0,
        isDowngraded: false,
        canUpload: storageUsed < planInfo.storageBytes,
        overQuota: storageUsed > planInfo.storageBytes,
        reason: 'ACTIVE_PERMANENT',
      };
    }

    const periodEnd = new Date(subscription.current_period_end);
    if (now < periodEnd) {
      const diffMs = periodEnd.getTime() - now.getTime();
      const remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        valid: true,
        localValid: true,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        plan: planInfo.name,
        planId: planInfo.id,
        storageLimit: planInfo.storageBytes,
        remainingDays,
        expirationDate: periodEnd.toLocaleDateString('vi-VN'),
        isPaid: true,
        isDowngraded: false,
        canUpload: storageUsed < planInfo.storageBytes,
        overQuota: storageUsed > planInfo.storageBytes,
        reason: 'PAID_ACTIVE',
      };
    }

    // Paid period expired -> Automatically downgrade to Free 256 MB
    // Local storage and existing files are preserved!
    return {
      valid: true,
      localValid: true,
      status: 'DOWNGRADED_FREE',
      plan: `Free · 256 MB (${planInfo.name.split('·')[0].trim()} hết hạn)`,
      planId: 'FREE_256MB',
      previousPlan: planInfo.name,
      storageLimit: c_free_limit,
      remainingDays: 0,
      expirationDate: periodEnd.toLocaleDateString('vi-VN'),
      isPaid: false,
      isDowngraded: true,
      canUpload: storageUsed < c_free_limit,
      overQuota: storageUsed > c_free_limit,
      reason: 'PAID_EXPIRED_DOWNGRADED_TO_FREE',
    };
  }

  // 4. CANCELLED with Grace Period Evaluation
  if (subscription.status === SUBSCRIPTION_STATUS.CANCELLED) {
    if (subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end);
      if (now < periodEnd) {
        const diffMs = periodEnd.getTime() - now.getTime();
        const remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        return {
          valid: true,
          localValid: true,
          status: 'CANCELLED_ACTIVE',
          plan: planInfo.name,
          planId: planInfo.id,
          storageLimit: planInfo.storageBytes,
          remainingDays,
          expirationDate: periodEnd.toLocaleDateString('vi-VN'),
          isPaid: true,
          isDowngraded: false,
          canUpload: storageUsed < planInfo.storageBytes,
          overQuota: storageUsed > planInfo.storageBytes,
          reason: 'CANCELLED_IN_GRACE_PERIOD',
        };
      }
    }

    return {
      valid: true,
      localValid: true,
      status: 'DOWNGRADED_FREE',
      plan: 'Free · 256 MB',
      planId: 'FREE_256MB',
      storageLimit: c_free_limit,
      remainingDays: 0,
      expirationDate: subscription.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('vi-VN')
        : 'Đã hủy',
      isPaid: false,
      isDowngraded: true,
      canUpload: storageUsed < c_free_limit,
      overQuota: storageUsed > c_free_limit,
      reason: 'CANCELLED_DOWNGRADED_TO_FREE',
    };
  }

  // 5. Default fallback to Free tier
  return {
    valid: true,
    localValid: true,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    plan: 'Free · 256 MB',
    planId: 'FREE_256MB',
    storageLimit: c_free_limit,
    remainingDays: null,
    expirationDate: 'Vĩnh viễn',
    isPaid: false,
    isDowngraded: false,
    canUpload: storageUsed < c_free_limit,
    overQuota: storageUsed > c_free_limit,
    reason: 'DEFAULT_FREE_TIER',
  };
};

/**
 * Main coordinator: Fetches or creates trial, then returns subscription and access assessment
 */
export const getOrInitSubscription = async (user) => {
  if (!user?.id) {
    return {
      subscription: null,
      access: {
        valid: false,
        status: SUBSCRIPTION_STATUS.EXPIRED,
        plan: 'NONE',
        remainingDays: 0,
        expirationDate: null,
        reason: 'NO_USER',
      },
    };
  }

  // 1. Fetch existing subscription from Supabase
  let sub = await fetchSubscription(user.id);

  // 2. If no record exists, try to create Trial via RPC
  if (!sub) {
    sub = await createTrialIfNeeded();
    if (sub) {
      void setCachedSubscription(user.id, sub);
    } else {
      sub = await fetchSubscription(user.id);
    }
  } else {
    void setCachedSubscription(user.id, sub);
  }

  // 3. Evaluate access strictly
  const access = evaluateAccess(sub);

  return {
    subscription: sub,
    access,
  };
};

/**
 * Request In-App Subscription Purchase
 * Interacts with backend verification Edge Function.
 * If provider is NOT configured, returns clear unconfigured status.
 * NEVER fakes ACTIVE on the client!
 */
export const requestSubscriptionPurchase = async ({
  planId = 'MONTHLY_VAULT',
  provider = 'GOOGLE_PLAY',
  receiptToken = null,
} = {}) => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { success: false, error: 'Chưa đăng nhập tài khoản' };
    }

    const response = await fetch(VERIFY_SUBSCRIPTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'verify-purchase',
        platform: provider === 'APPLE' ? 'app_store' : 'google_play',
        productId: planId,
        receiptToken,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        configured: data.configured !== false,
        error:
          data.error ||
          'Cổng thanh toán In-App chưa được cấu hình trên máy chủ backend (Payment provider not configured).',
      };
    }

    return {
      success: true,
      subscription: data.subscription,
    };
  } catch (err) {
    return {
      success: false,
      configured: false,
      error: `Không thể kết nối cổng thanh toán: ${err.message}`,
    };
  }
};

/**
 * Restore In-App Purchases
 * Interacts with backend verification Edge Function.
 */
export const restorePurchases = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { success: false, error: 'Chưa đăng nhập tài khoản' };
    }

    const response = await fetch(VERIFY_SUBSCRIPTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'restore-purchase',
        platform: 'google_play',
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        configured: data.configured !== false,
        error:
          data.error ||
          'Không tìm thấy giao dịch mua trước đó hoặc cổng thanh toán chưa được cấu hình.',
      };
    }

    return {
      success: true,
      subscription: data.subscription,
    };
  } catch (err) {
    return {
      success: false,
      configured: false,
      error: `Không thể kết nối khôi phục giao dịch: ${err.message}`,
    };
  }
};

/**
 * Kích hoạt gói cước sau khi người dùng xác nhận chuyển khoản ngân hàng (VietQR)
 */
export const activateManualSubscription = async (user, planId = 'STANDARD_1_5GB') => {
  if (!user?.id) return { success: false, error: 'Chưa đăng nhập tài khoản' };

  const plan = getPlanById(planId);
  const now = new Date();
  const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const updatedSubscription = {
    user_id: user.id,
    status: SUBSCRIPTION_STATUS.ACTIVE,
    plan: plan.name,
    plan_id: plan.id,
    storage_limit: plan.storageBytes,
    current_period_start: now.toISOString(),
    current_period_end: nextMonth.toISOString(),
    updated_at: now.toISOString(),
  };

  try {
    // 1. Lưu vào Supabase bảng subscriptions nếu có kết nối
    await supabase.from('subscriptions').upsert(updatedSubscription);
    // 2. Đồng bộ authoritative storage_limit vào profiles
    await supabase
      .from('profiles')
      .update({ storage_limit: plan.storageBytes, updated_at: now.toISOString() })
      .eq('id', user.id);
  } catch (err) {
    console.warn('Lỗi đồng bộ subscription lên Supabase:', err.message);
  }

  // 3. Lưu vào local cache AsyncStorage
  await setCachedSubscription(user.id, updatedSubscription);

  return {
    success: true,
    subscription: updatedSubscription,
    access: evaluateAccess(updatedSubscription),
  };
};

