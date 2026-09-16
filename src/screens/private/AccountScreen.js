import React, { useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { getUserStorageUsage } from '../../services/cloudStorage';
import { getPendingQueueCount, subscribeToSyncChanges } from '../../services/syncManager';
import { formatBytes } from '../../utils/helpers';

export default function AccountScreen({ onBack, onSyncNow, onOpenSubscription, isSyncing, lastSync }) {
  const {
    currentUser,
    subscriptionAccess,
    signInWithEmail,
    signUpWithEmail,
    signOutUser,
  } = useContext(AuthContext);

  const [storageUsage, setStorageUsage] = useState({ storage_used: 0, storage_limit: 5368709120 });
  const [pendingCount, setPendingCount] = useState(0);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  useEffect(() => {
    if (currentUser) {
      void getUserStorageUsage().then(setStorageUsage);
      void getPendingQueueCount(currentUser.id).then(setPendingCount);
      const unsubscribe = subscribeToSyncChanges(() => {
        void getPendingQueueCount(currentUser.id).then(setPendingCount);
        void getUserStorageUsage().then(setStorageUsage);
      });
      return unsubscribe;
    }
  }, [currentUser, isSyncing]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAuth = async () => {
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu cần ít nhất 6 ký tự.');
      return;
    }

    if (isRegisterMode && password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    if (isRegisterMode) {
      const res = await signUpWithEmail(email, password);
      setLoading(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Đăng ký thất bại.');
        return;
      }

      if (res.needsConfirmation) {
        Alert.alert(
          'Đăng ký thành công',
          'Vui lòng kiểm tra hộp thư email của bạn để xác thực tài khoản trước khi đăng nhập (hoặc tắt Confirm email trong Supabase để đăng nhập ngay).'
        );
      } else {
        Alert.alert('Thành công', 'Đã tạo tài khoản và tự động đăng nhập!');
      }
    } else {
      const res = await signInWithEmail(email, password);
      setLoading(false);

      if (!res.success) {
        setErrorMessage(res.error || 'Đăng nhập thất bại.');
        return;
      }

      Alert.alert('Đăng nhập thành công', `Chào mừng ${res.user?.email}`);
    }
  };

  const handleSignOut = () => {
    Alert.alert('Xác nhận đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản này khỏi thiết bị?', [
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backText}>← Vault</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Tài khoản Cloud</Text>
        <Text style={styles.subtitle}>
          Sao lưu dữ liệu cá nhân lên đám mây Supabase an toàn và độc quyền của bạn.
        </Text>

        {currentUser ? (
          /* Logged In View */
          <View style={styles.card}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountEmail} numberOfLines={1}>
                  {currentUser.email}
                </Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeDot}>●</Text>
                  <Text style={styles.badgeText}>Đã kết nối Supabase</Text>
                </View>
              </View>
            </View>

            <View style={styles.metaDivider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>User ID:</Text>
              <Text style={styles.metaValue} numberOfLines={1}>
                {currentUser.id}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Gói dịch vụ:</Text>
              <Text style={styles.metaValue}>
                {subscriptionAccess?.plan || 'Free Trial 30 Ngày'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Trạng thái gói:</Text>
              <Text style={[styles.metaValue, { color: subscriptionAccess?.valid ? '#4ADE80' : '#F87171' }]}>
                {subscriptionAccess?.valid ? '● Đang hoạt động' : '● Hết hạn'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Thời hạn:</Text>
              <Text style={styles.metaValue}>
                {subscriptionAccess?.remainingDays
                  ? `Còn ${subscriptionAccess.remainingDays} ngày`
                  : subscriptionAccess?.expirationDate || 'N/A'}
              </Text>
            </View>

            {onOpenSubscription ? (
              <TouchableOpacity
                style={styles.manageSubButton}
                onPress={onOpenSubscription}
                activeOpacity={0.8}
              >
                <Text style={styles.manageSubButtonText}>
                  {subscriptionAccess?.valid ? '👑 Quản lý gói thành viên' : '⚠️ Gia hạn gói thành viên'}
                </Text>
              </TouchableOpacity>
            ) : null}

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Dung lượng Cloud:</Text>
              <Text style={styles.metaValue}>
                {formatBytes(storageUsage.storage_used)} / {formatBytes(storageUsage.storage_limit)}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Lần đồng bộ cuối:</Text>
              <Text style={styles.metaValue}>
                {lastSync ? lastSync : 'Chưa đồng bộ'}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Hàng đợi đồng bộ:</Text>
              <Text style={[styles.metaValue, { color: pendingCount > 0 ? '#FBBF24' : '#4ADE80' }]}>
                {pendingCount > 0 ? `⏳ ${pendingCount} mục chờ tải lên` : '✅ Đã đồng bộ hoàn tất'}
              </Text>
            </View>

            {onSyncNow ? (
              <TouchableOpacity
                style={[styles.syncButton, isSyncing && styles.buttonDisabled]}
                disabled={isSyncing}
                onPress={onSyncNow}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Text style={styles.syncButtonText}>☁️ Đồng bộ dữ liệu ngay</Text>
                )}
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutButtonText}>Đăng xuất tài khoản</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Authentication Form */
          <View style={styles.card}>
            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, !isRegisterMode && styles.activeTab]}
                onPress={() => {
                  setIsRegisterMode(false);
                  setErrorMessage('');
                }}
              >
                <Text style={[styles.tabText, !isRegisterMode && styles.activeTabText]}>
                  Đăng nhập
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tab, isRegisterMode && styles.activeTab]}
                onPress={() => {
                  setIsRegisterMode(true);
                  setErrorMessage('');
                }}
              >
                <Text style={[styles.tabText, isRegisterMode && styles.activeTabText]}>
                  Đăng ký
                </Text>
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Inputs */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tenban@example.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {isRegisterMode ? (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor="#64748B"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              disabled={loading}
              onPress={handleAuth}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isRegisterMode ? 'Tạo tài khoản' : 'Đăng nhập'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={styles.noteTip}>
              {isRegisterMode
                ? 'Tài khoản giúp đồng bộ và bảo vệ dữ liệu riêng biệt theo từng người dùng.'
                : 'Chưa có tài khoản? Chuyển sang tab Đăng ký phía trên.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#111C34',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '700',
  },
  accountInfo: {
    flex: 1,
  },
  accountEmail: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeDot: {
    color: '#10B981',
    fontSize: 10,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '500',
  },
  metaDivider: {
    height: 1,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    marginVertical: 18,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaLabel: {
    color: '#94A3B8',
    fontSize: 13,
  },
  metaValue: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
    maxWidth: '60%',
  },
  syncButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  syncButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  manageSubButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  manageSubButtonText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  signOutButtonText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#1E293B',
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#38BDF8',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  submitButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  submitButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  noteTip: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
