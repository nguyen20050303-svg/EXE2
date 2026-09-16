import { SUPABASE_URL, supabase } from './supabase.js';

export const SUBSCRIPTION_STATUS = {
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};

export const VERIFY_SUBSCRIPTION_URL = `${SUPABASE_URL}/functions/v1/verify-subscription`;

/**
 * Fetch subscription record from Supabase database
 */
export const fetchSubscription = async (userId) => {
  if (!userId) return null;

  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Lỗi truy vấn subscription từ Supabase:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('Lỗi mạng khi tải subscription:', err.message);
    return null;
  }
};

export const getSubscription = fetchSubscription;

/**
 * Get status string from subscription record
 */
export const getSubscriptionStatus = (subscription) => subscription?.status || SUBSCRIPTION_STATUS.EXPIRED;

/**
 * Check if evaluated access allows entry to Vault
 */
export const isSubscriptionValid = (access) => Boolean(access?.valid);

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
 * Creates 30-day Free Trial via secure server RPC if not already created
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
 * Authoritative: Client NEVER grants itself ACTIVE status.
 */
export const evaluateAccess = (subscription) => {
  if (!subscription) {
    return {
      valid: false,
      status: SUBSCRIPTION_STATUS.EXPIRED,
      plan: 'UNKNOWN',
      remainingDays: 0,
      expirationDate: null,
      reason: 'NO_SUBSCRIPTION_FOUND',
    };
  }

  const now = new Date();

  // 1. TRIAL Evaluation
  if (subscription.status === SUBSCRIPTION_STATUS.TRIAL) {
    if (!subscription.trial_end_at) {
      return {
        valid: false,
        status: SUBSCRIPTION_STATUS.EXPIRED,
        plan: subscription.plan || 'FREE_TRIAL',
        remainingDays: 0,
        expirationDate: null,
        reason: 'INVALID_TRIAL_TIMESTAMP',
      };
    }

    const trialEnd = new Date(subscription.trial_end_at);
    if (now < trialEnd) {
      const diffMs = trialEnd.getTime() - now.getTime();
      const remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        valid: true,
        status: SUBSCRIPTION_STATUS.TRIAL,
        plan: subscription.plan || 'FREE_TRIAL',
        remainingDays,
        expirationDate: trialEnd.toLocaleDateString('vi-VN'),
        reason: 'TRIAL_ACTIVE',
      };
    }

    return {
      valid: false,
      status: SUBSCRIPTION_STATUS.EXPIRED,
      plan: subscription.plan || 'FREE_TRIAL',
      remainingDays: 0,
      expirationDate: trialEnd.toLocaleDateString('vi-VN'),
      reason: 'TRIAL_EXPIRED',
    };
  }

  // 2. ACTIVE Evaluation
  if (subscription.status === SUBSCRIPTION_STATUS.ACTIVE) {
    if (!subscription.current_period_end) {
      return {
        valid: false,
        status: SUBSCRIPTION_STATUS.EXPIRED,
        plan: subscription.plan || 'MONTHLY',
        remainingDays: 0,
        expirationDate: null,
        reason: 'INVALID_PERIOD_TIMESTAMP',
      };
    }

    const periodEnd = new Date(subscription.current_period_end);
    if (now < periodEnd) {
      const diffMs = periodEnd.getTime() - now.getTime();
      const remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      return {
        valid: true,
        status: SUBSCRIPTION_STATUS.ACTIVE,
        plan: subscription.plan || 'MONTHLY',
        remainingDays,
        expirationDate: periodEnd.toLocaleDateString('vi-VN'),
        reason: 'SUBSCRIPTION_ACTIVE',
      };
    }

    return {
      valid: false,
      status: SUBSCRIPTION_STATUS.EXPIRED,
      plan: subscription.plan || 'MONTHLY',
      remainingDays: 0,
      expirationDate: periodEnd.toLocaleDateString('vi-VN'),
      reason: 'SUBSCRIPTION_EXPIRED',
    };
  }

  // 3. CANCELLED with Grace Period Evaluation
  if (subscription.status === SUBSCRIPTION_STATUS.CANCELLED) {
    if (subscription.current_period_end) {
      const periodEnd = new Date(subscription.current_period_end);
      if (now < periodEnd) {
        const diffMs = periodEnd.getTime() - now.getTime();
        const remainingDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        return {
          valid: true,
          status: 'CANCELLED_ACTIVE',
          plan: subscription.plan || 'MONTHLY',
          remainingDays,
          expirationDate: periodEnd.toLocaleDateString('vi-VN'),
          reason: 'CANCELLED_IN_GRACE_PERIOD',
        };
      }
    }

    return {
      valid: false,
      status: SUBSCRIPTION_STATUS.EXPIRED,
      plan: subscription.plan || 'MONTHLY',
      remainingDays: 0,
      expirationDate: subscription.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('vi-VN')
        : null,
      reason: 'CANCELLED_EXPIRED',
    };
  }

  // 4. Default Expired
  return {
    valid: false,
    status: SUBSCRIPTION_STATUS.EXPIRED,
    plan: subscription.plan || 'EXPIRED',
    remainingDays: 0,
    expirationDate: null,
    reason: 'STATUS_NOT_ACTIVE',
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
    if (!sub) {
      sub = await fetchSubscription(user.id);
    }
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
