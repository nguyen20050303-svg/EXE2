export const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'Chưa xác định';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return dateString;
  }
};

export const isPaidSubscription = (sub) => {
  if (!sub || !sub.plan) return false;
  const plan = String(sub.plan).toUpperCase();
  if (plan === 'FREE' || plan === 'FREE_256MB' || plan === 'FREE_TRIAL') return false;
  const status = String(sub.status || '').toUpperCase();
  if (status && status !== 'ACTIVE' && status !== 'PAID') return false;
  return true;
};

export const formatPlanName = (planId) => {
  if (!planId) return 'Free 256MB';
  const p = String(planId).toUpperCase();
  if (p.includes('500MB') || p === 'BASIC') return 'Basic 500MB';
  if (p.includes('1_5GB') || p === 'STANDARD') return 'Standard 1.5GB';
  if (p.includes('5GB') || p === 'PREMIUM' || p === 'PLUS') return 'Premium 5GB';
  if (p === 'FREE' || p.includes('256MB')) return 'Free 256MB';
  return planId;
};
