import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import {
  requestSubscriptionPurchase,
  restorePurchases,
  SUBSCRIPTION_STATUS,
} from '../../services/subscriptionService';

export default function SubscriptionScreen({ onBack = null }) {
  const { currentUser, subscription, subscriptionAccess, refreshSubscription, signOutUser } =
    useContext(AuthContext);

  const [loadingAction, setLoadingAction] = useState(false);

  const isExpired = !subscriptionAccess?.valid;
  const isActive = subscriptionAccess?.status === SUBSCRIPTION_STATUS.ACTIVE;
  const isTrial = subscriptionAccess?.status === SUBSCRIPTION_STATUS.TRIAL && subscriptionAccess?.valid;

  const handleSubscribePress = async () => {
    try {
      setLoadingAction(true);
      const provider = Platform.OS === 'ios' ? 'APPLE' : 'GOOGLE_PLAY';
      const result = await requestSubscriptionPurchase({
        planId: 'MONTHLY_VAULT',
        provider,
      });

      if (!result.success) {
        Alert.alert(
          'Dịch vụ thanh toán In-App',
          result.error ||
            'Hệ thống thanh toán Google Play Billing / Apple In-App Purchase đang ở chế độ thử nghiệm (PAYMENT PROVIDER: NOT CONFIGURED).\n\nTrạng thái tài khoản không đổi. Tuyệt đối không giả lập thanh toán thành công.',
          [{ text: 'Đã hiểu' }]
        );
      } else {
        if (refreshSubscription) {
          await refreshSubscription();
        }
        Alert.alert('Thành công', 'Đăng ký gói thành viên thành công!');
      }
    } catch (err) {
      Alert.alert('Lỗi', `Không thể hoàn tất giao dịch: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRestorePress = async () => {
    try {
      setLoadingAction(true);
      const result = await restorePurchases();

      if (!result.success) {
        Alert.alert(
          'Khôi phục gói mua',
          result.error || 'Chưa tìm thấy giao dịch mua hợp lệ nào trên tài khoản Store của bạn.',
          [{ text: 'Đóng' }]
        );
      } else {
        if (refreshSubscription) {
          await refreshSubscription();
        }
        Alert.alert('Thành công', 'Đã khôi phục thành công gói đăng ký của bạn!');
      }
    } catch (err) {
      Alert.alert('Lỗi', `Khôi phục thất bại: ${err.message}`);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Đăng xuất', 'Bạn có muốn đăng xuất khỏi tài khoản này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await signOutUser();
        },
      },
    ]);
  };

  let title = 'Thời hạn sử dụng đã hết';
  let subtitle =
    '30 ngày dùng thử miễn phí của bạn đã kết thúc. Vui lòng đăng ký gói thành viên để tiếp tục mở khóa két bảo mật Hidder.';
  let icon = '⏳';
  let badgeText = 'HẾT HẠN';
  let badgeStyle = styles.badgeExpired;
  let badgeTextStyle = styles.badgeExpiredText;

  if (isActive) {
    title = 'Gói Thành Viên Đang Hoạt Động';
    subtitle = 'Két bảo mật Hidder của bạn đang được bảo vệ toàn diện.';
    icon = '💎';
    badgeText = 'ĐANG HOẠT ĐỘNG';
    badgeStyle = styles.badgeActive;
    badgeTextStyle = styles.badgeActiveText;
  } else if (isTrial) {
    title = '30 Ngày Dùng Thử Miễn Phí';
    subtitle = `Bạn còn ${subscriptionAccess.remainingDays} ngày trải nghiệm đầy đủ tất cả các tính năng của Hidder.`;
    icon = '✨';
    badgeText = `DÙNG THỬ (CÒN ${subscriptionAccess.remainingDays} NGÀY)`;
    badgeStyle = styles.badgeTrial;
    badgeTextStyle = styles.badgeTrialText;
  }

  const expirationText = subscriptionAccess?.expirationDate
    ? `Hết hạn / Gia hạn: ${subscriptionAccess.expirationDate}`
    : 'Thời hạn dùng thử miễn phí đã kết thúc.';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Navigation Back (if provided) */}
        {onBack ? (
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Text style={styles.backButtonText}>← Quay lại</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.warningIconCircle}>
            <Text style={styles.warningIconText}>{icon}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* Current Plan Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tài khoản:</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {currentUser?.email || 'N/A'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gói hiện tại:</Text>
            <Text style={styles.infoValue}>
              {subscriptionAccess?.plan || 'Free Trial 30 Ngày'}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tình trạng:</Text>
            <View style={badgeStyle}>
              <Text style={badgeTextStyle}>{badgeText}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Thời hạn:</Text>
            <Text
              style={[
                styles.infoValue,
                { color: isExpired ? '#F87171' : isActive ? '#4ADE80' : '#38BDF8' },
              ]}
            >
              {expirationText}
            </Text>
          </View>
        </View>

        {/* Pricing Plan Card */}
        <View style={styles.planCard}>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>GÓI CHÍNH THỨC</Text>
          </View>
          <Text style={styles.planTitle}>Gói Thành Viên Bảo Mật Hidder</Text>
          <Text style={styles.planPrice}>
            $2.99 <Text style={styles.planPeriod}>/ tháng</Text>
          </Text>

          <View style={styles.benefitsList}>
            <Text style={styles.benefitItem}>✓ Không giới hạn lưu trữ ảnh & video bảo mật</Text>
            <Text style={styles.benefitItem}>✓ Lưu trữ mật khẩu & ghi chú nhạy cảm không giới hạn</Text>
            <Text style={styles.benefitItem}>✓ Vỏ ngụy trang Stealth Shell (Máy tính & Ghi chú)</Text>
            <Text style={styles.benefitItem}>✓ Cơ chế Decoy Vault đánh lạc hướng khi bị ép mở</Text>
            <Text style={styles.benefitItem}>✓ Mã hóa đầu cuối Client-side AES-256-GCM</Text>
            <Text style={styles.benefitItem}>✓ Khóa Master Key độc quyền lưu trữ phần cứng thiết bị</Text>
            <Text style={styles.benefitItem}>✓ Sao lưu đám mây bảo mật Google Cloud Storage</Text>
          </View>

          <TouchableOpacity
            style={[styles.subscribeButton, loadingAction && styles.buttonDisabled]}
            disabled={loadingAction}
            onPress={handleSubscribePress}
            activeOpacity={0.85}
          >
            {loadingAction ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                {isActive ? 'Gia hạn gói thành viên' : 'Gia hạn & Đăng ký ngay'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreButton}
            disabled={loadingAction}
            onPress={handleRestorePress}
            activeOpacity={0.7}
          >
            <Text style={styles.restoreButtonText}>Khôi phục gói mua (Restore Purchases)</Text>
          </TouchableOpacity>
        </View>

        {/* Disguise Shell Return (if onBack) */}
        {onBack ? (
          <TouchableOpacity style={styles.disguiseButton} onPress={onBack}>
            <Text style={styles.disguiseButtonText}>🔒 Về màn hình ngụy trang</Text>
          </TouchableOpacity>
        ) : null}

        {/* Logout Option */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutButtonText}>Đăng xuất tài khoản này</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 12,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  warningIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  warningIconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  infoCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    marginVertical: 6,
  },
  badgeExpired: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  badgeExpiredText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  badgeActiveText: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTrial: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  badgeTrialText: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
  },
  planCard: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 22,
    padding: 20,
    borderWidth: 2,
    borderColor: '#38BDF8',
    marginBottom: 16,
    position: 'relative',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  planBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  planTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 26,
    fontWeight: '800',
    color: '#38BDF8',
    marginBottom: 14,
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
  },
  benefitsList: {
    marginBottom: 18,
    gap: 7,
  },
  benefitItem: {
    fontSize: 12.5,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  subscribeButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  subscribeButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  restoreButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  disguiseButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  disguiseButtonText: {
    color: '#CBD5E1',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoutButtonText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
