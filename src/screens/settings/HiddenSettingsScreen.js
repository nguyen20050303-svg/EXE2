import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { confirmAction } from '../../utils/helpers';

export default function HiddenSettingsScreen({ onBack }) {
  const {
    currentUser,
    subscriptionAccess,
    disguiseType,
    changeDisguiseType,
    biometricEnabled,
    biometricAvailable,
    updateBiometricSetting,
    reauthenticateWithPassword,
    updateRealCode,
    updateDecoyCode,
    authenticateBiometric,
    signOutUser,
  } = useContext(AuthContext);

  // Authentication barrier state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // PIN settings state
  const [newRealPin, setNewRealPin] = useState('');
  const [confirmRealPin, setConfirmRealPin] = useState('');
  const [realPinMessage, setRealPinMessage] = useState({ type: '', text: '' });
  const [pinLoading, setPinLoading] = useState(false);

  // Decoy PIN state
  const [newDecoyPin, setNewDecoyPin] = useState('');
  const [decoyPinMessage, setDecoyPinMessage] = useState({ type: '', text: '' });
  const [decoyLoading, setDecoyLoading] = useState(false);

  // Handle account password verification
  const handleVerifyPassword = async () => {
    setAuthError('');
    if (!authPassword.trim()) {
      setAuthError('Vui lòng nhập mật khẩu tài khoản.');
      return;
    }

    setAuthLoading(true);
    const res = await reauthenticateWithPassword(authPassword);
    setAuthLoading(false);

    if (res.success) {
      setIsAuthenticated(true);
      setAuthPassword('');
    } else {
      setAuthError(res.error || 'Mật khẩu tài khoản không đúng.');
    }
  };

  // Handle biometric authentication bypass
  const handleBiometricAuth = async () => {
    setAuthError('');
    const success = await authenticateBiometric();
    if (success) {
      setIsAuthenticated(true);
    } else {
      setAuthError('Xác thực sinh trắc học không thành công.');
    }
  };

  // Handle Real PIN update
  const handleSaveRealPin = async () => {
    setRealPinMessage({ type: '', text: '' });

    if (!newRealPin.trim() || newRealPin.length < 4) {
      setRealPinMessage({ type: 'error', text: 'Real PIN cần tối thiểu 4 ký tự/chữ số.' });
      return;
    }

    if (newRealPin !== confirmRealPin) {
      setRealPinMessage({ type: 'error', text: 'Xác nhận mã PIN mới không khớp.' });
      return;
    }

    setPinLoading(true);
    const res = await updateRealCode(newRealPin);
    setPinLoading(false);

    if (res.success) {
      setRealPinMessage({
        type: 'success',
        text: 'Đã đổi Real PIN thành công! Dữ liệu két bảo mật và khóa Master Key được bảo toàn nguyên vẹn.',
      });
      setNewRealPin('');
      setConfirmRealPin('');
    } else {
      setRealPinMessage({ type: 'error', text: res.error || 'Không thể đổi Real PIN.' });
    }
  };

  // Handle Decoy PIN update
  const handleSaveDecoyPin = async () => {
    setDecoyPinMessage({ type: '', text: '' });
    setDecoyLoading(true);
    const res = await updateDecoyCode(newDecoyPin);
    setDecoyLoading(false);

    if (res.success) {
      setDecoyPinMessage({
        type: 'success',
        text: newDecoyPin.trim()
          ? 'Đã cập nhật Decoy PIN thành công!'
          : 'Đã xóa Decoy PIN (chế độ két mồi đã tắt).',
      });
      setNewDecoyPin('');
    } else {
      setDecoyPinMessage({ type: 'error', text: res.error || 'Không thể đổi Decoy PIN.' });
    }
  };

  // Handle disguise change
  const handleDisguiseSelect = async (type) => {
    await changeDisguiseType(type);
  };

  // Handle biometrics toggle
  const handleToggleBiometric = async (value) => {
    await updateBiometricSetting(value);
  };

  // Handle sign out
  const handleSignOut = () => {
    confirmAction({
      title: 'Xác nhận đăng xuất',
      message: 'Đăng xuất sẽ khóa ứng dụng và yêu cầu đăng nhập lại tài khoản.',
      confirmText: 'Đăng xuất',
      onConfirm: async () => {
        await signOutUser();
        onBack();
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt bảo mật ẩn</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BARRIER: If not authenticated, require password or biometric */}
        {!isAuthenticated ? (
          <View style={styles.barrierCard}>
            <View style={styles.barrierIconWrap}>
              <Text style={styles.barrierIcon}>🛡️</Text>
            </View>
            <Text style={styles.barrierTitle}>Xác thực danh tính chủ sở hữu</Text>
            <Text style={styles.barrierDescription}>
              Đây là khu vực bảo mật ngầm. Vui lòng xác thực bằng mật khẩu tài khoản đã đăng ký để
              khôi phục Real PIN hoặc điều chỉnh thiết lập.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Tài khoản hiện tại</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={currentUser?.email || 'Chưa đăng nhập'}
                editable={false}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mật khẩu tài khoản Supabase</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu tài khoản"
                placeholderTextColor="#6B7280"
                value={authPassword}
                onChangeText={(t) => {
                  setAuthPassword(t);
                  setAuthError('');
                }}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {authError ? <Text style={styles.errorText}>{authError}</Text> : null}

            <TouchableOpacity
              style={[styles.primaryButton, authLoading && styles.disabledButton]}
              onPress={handleVerifyPassword}
              disabled={authLoading}
            >
              {authLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Xác thực mật khẩu</Text>
              )}
            </TouchableOpacity>

            {biometricEnabled && biometricAvailable ? (
              <TouchableOpacity
                style={styles.biometricAuthButton}
                onPress={handleBiometricAuth}
              >
                <Text style={styles.biometricAuthText}>◎ Mở nhanh bằng Sinh trắc học</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.cancelLink} onPress={onBack}>
              <Text style={styles.cancelLinkText}>✕ Hủy và quay lại ngụy trang</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* AUTHENTICATED: Display Full Hidden Settings */
          <View style={styles.settingsContent}>
            {/* Authenticated badge */}
            <View style={styles.authBadge}>
              <Text style={styles.authBadgeIcon}>✓</Text>
              <Text style={styles.authBadgeText}>
                Đã xác thực danh tính: {currentUser?.email}
              </Text>
            </View>

            {/* Section 1: Real PIN Recovery / Change */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>🔑</Text>
                <View>
                  <Text style={styles.sectionTitle}>Khôi phục / Đổi Real PIN</Text>
                  <Text style={styles.sectionSubtitle}>
                    Mở két thật chứa ảnh, video, ghi chú & tài liệu
                  </Text>
                </View>
              </View>

              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  🛡️ An toàn tuyệt đối: Khóa mã hóa Master Key AES-256 được lưu giữ độc lập. Đổi
                  Real PIN sẽ KHÔNG làm mất dữ liệu đã mã hóa trong máy và Cloud!
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mã Real PIN mới (tối thiểu 4 số/ký tự)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ví dụ: 1234 hoặc 8899"
                  placeholderTextColor="#6B7280"
                  value={newRealPin}
                  onChangeText={setNewRealPin}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={12}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Xác nhận Real PIN mới</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập lại mã PIN mới"
                  placeholderTextColor="#6B7280"
                  value={confirmRealPin}
                  onChangeText={setConfirmRealPin}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={12}
                />
              </View>

              {realPinMessage.text ? (
                <Text
                  style={
                    realPinMessage.type === 'success'
                      ? styles.successText
                      : styles.errorText
                  }
                >
                  {realPinMessage.text}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[styles.primaryButton, pinLoading && styles.disabledButton]}
                onPress={handleSaveRealPin}
                disabled={pinLoading}
              >
                {pinLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Lưu Real PIN mới</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Section 2: Decoy PIN */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>🎭</Text>
                <View>
                  <Text style={styles.sectionTitle}>Cài đặt Decoy PIN (Két mồi)</Text>
                  <Text style={styles.sectionSubtitle}>
                    Mở két giả khi bị cưỡng ép nhập mã trước mặt người khác
                  </Text>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Mã Decoy PIN mới (để trống nếu muốn tắt két mồi)
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Để trống hoặc nhập mã khác Real PIN"
                  placeholderTextColor="#6B7280"
                  value={newDecoyPin}
                  onChangeText={setNewDecoyPin}
                  secureTextEntry
                  keyboardType="numeric"
                  maxLength={12}
                />
              </View>

              {decoyPinMessage.text ? (
                <Text
                  style={
                    decoyPinMessage.type === 'success'
                      ? styles.successText
                      : styles.errorText
                  }
                >
                  {decoyPinMessage.text}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[styles.secondaryButton, decoyLoading && styles.disabledButton]}
                onPress={handleSaveDecoyPin}
                disabled={decoyLoading}
              >
                {decoyLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.secondaryButtonText}>Cập nhật Decoy PIN</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Section 3: Disguise Shell */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>🕵️</Text>
                <View>
                  <Text style={styles.sectionTitle}>Đổi Vỏ Ngụy Trang</Text>
                  <Text style={styles.sectionSubtitle}>
                    Chọn lớp giao diện ngụy trang công khai mặc định
                  </Text>
                </View>
              </View>

              <View style={styles.disguiseOptions}>
                <TouchableOpacity
                  style={[
                    styles.disguiseCard,
                    disguiseType === 'calculator' && styles.disguiseCardActive,
                  ]}
                  onPress={() => handleDisguiseSelect('calculator')}
                >
                  <Text style={styles.disguiseCardIcon}>🧮</Text>
                  <Text style={styles.disguiseCardTitle}>Máy tính bỏ túi</Text>
                  <Text style={styles.disguiseCardSub}>
                    Giao diện tính toán thật. Nhấn giữ màn hình hoặc phím = 2s để vào Cài đặt ẩn.
                  </Text>
                  {disguiseType === 'calculator' ? (
                    <View style={styles.activeTag}>
                      <Text style={styles.activeTagText}>Đang dùng</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.disguiseCard,
                    disguiseType === 'notes' && styles.disguiseCardActive,
                  ]}
                  onPress={() => handleDisguiseSelect('notes')}
                >
                  <Text style={styles.disguiseCardIcon}>📝</Text>
                  <Text style={styles.disguiseCardTitle}>Ghi chú thông thường</Text>
                  <Text style={styles.disguiseCardSub}>
                    Giao diện Notes Apple. Nhấn giữ tiêu đề hoặc gõ //settings để vào Cài đặt ẩn.
                  </Text>
                  {disguiseType === 'notes' ? (
                    <View style={styles.activeTag}>
                      <Text style={styles.activeTagText}>Đang dùng</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.disguiseCard,
                    disguiseType === 'weather' && styles.disguiseCardActive,
                  ]}
                  onPress={() => handleDisguiseSelect('weather')}
                >
                  <Text style={styles.disguiseCardIcon}>⛅</Text>
                  <Text style={styles.disguiseCardTitle}>Dự báo thời tiết (Weather)</Text>
                  <Text style={styles.disguiseCardSub}>
                    Giao diện thời tiết thật. Nhấn giữ nhiệt độ hoặc gõ mã vào ô tìm thành phố để mở kho.
                  </Text>
                  {disguiseType === 'weather' ? (
                    <View style={styles.activeTag}>
                      <Text style={styles.activeTagText}>Đang dùng</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.disguiseCard,
                    disguiseType === 'calendar' && styles.disguiseCardActive,
                  ]}
                  onPress={() => handleDisguiseSelect('calendar')}
                >
                  <Text style={styles.disguiseCardIcon}>📅</Text>
                  <Text style={styles.disguiseCardTitle}>Lịch & Sự kiện (Calendar)</Text>
                  <Text style={styles.disguiseCardSub}>
                    Giao diện lịch biểu cá nhân. Nhấn giữ tháng hoặc gõ mã vào ô tìm sự kiện để mở kho.
                  </Text>
                  {disguiseType === 'calendar' ? (
                    <View style={styles.activeTag}>
                      <Text style={styles.activeTagText}>Đang dùng</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            </View>

            {/* Section 4: Biometrics Setting */}
            <View style={styles.sectionCard}>
              <View style={styles.switchRow}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={styles.sectionTitle}>Mở khóa bằng Sinh trắc học</Text>
                  <Text style={styles.sectionSubtitle}>
                    Sử dụng Vân tay hoặc FaceID trên góc ngụy trang bí mật
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometric}
                  trackColor={{ false: '#374151', true: '#2563EB' }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Section 5: Subscription & Account */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionIcon}>👤</Text>
                <View>
                  <Text style={styles.sectionTitle}>Tài khoản & Lưu trữ Cloud</Text>
                  <Text style={styles.sectionSubtitle}>
                    {currentUser?.email} ({subscriptionAccess?.plan || 'Free · 256 MB'})
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: '#4ADE80', marginTop: 2 }]}>
                    💾 Lưu trữ máy: Miễn phí trọn đời
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.dangerButton} onPress={handleSignOut}>
                <Text style={styles.dangerButtonText}>Đăng xuất tài khoản</Text>
              </TouchableOpacity>
            </View>

            {/* Exit Button */}
            <TouchableOpacity style={styles.completeButton} onPress={onBack}>
              <Text style={styles.completeButtonText}>✓ Hoàn tất & Thoát ngụy trang</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  backButtonText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  barrierCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    marginTop: 20,
  },
  barrierIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  barrierIcon: {
    fontSize: 32,
  },
  barrierTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  barrierDescription: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  fieldGroup: {
    width: '100%',
    marginBottom: 16,
  },
  fieldLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    color: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputDisabled: {
    color: '#64748B',
    backgroundColor: '#162032',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  biometricAuthButton: {
    width: '100%',
    backgroundColor: '#1E3A8A',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  biometricAuthText: {
    color: '#93C5FD',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelLink: {
    marginTop: 20,
    padding: 8,
  },
  cancelLinkText: {
    color: '#64748B',
    fontSize: 14,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 12,
    width: '100%',
  },
  successText: {
    color: '#10B981',
    fontSize: 13,
    marginBottom: 12,
    width: '100%',
    lineHeight: 18,
  },
  settingsContent: {
    width: '100%',
  },
  authBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#059669',
    marginBottom: 20,
  },
  authBadgeIcon: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 16,
    marginRight: 8,
  },
  authBadgeText: {
    color: '#A7F3D0',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  noticeBox: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
    marginBottom: 16,
  },
  noticeText: {
    color: '#93C5FD',
    fontSize: 12,
    lineHeight: 18,
  },
  secondaryButton: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  secondaryButtonText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  disguiseOptions: {
    gap: 12,
  },
  disguiseCard: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 16,
    position: 'relative',
  },
  disguiseCardActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#1E293B',
  },
  disguiseCardIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  disguiseCardTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  disguiseCardSub: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
  },
  activeTag: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerButtonText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
