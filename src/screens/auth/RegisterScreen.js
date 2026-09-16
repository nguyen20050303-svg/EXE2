import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

export default function RegisterScreen({ onNavigateToLogin }) {
  const { signUpWithEmail } = useContext(AuthContext);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successInfo, setSuccessInfo] = useState('');

  const validateEmail = (emailStr) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr.trim());
  };

  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessInfo('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Vui lòng nhập địa chỉ Email.');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setErrorMessage('Địa chỉ Email không đúng định dạng.');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Mật khẩu bảo mật cần tối thiểu 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
      return;
    }

    setLoading(true);
    const result = await signUpWithEmail(trimmedEmail, password);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Đăng ký không thành công. Vui lòng thử lại.');
      return;
    }

    if (result.needsConfirmation) {
      setSuccessInfo(
        'Tài khoản đã được tạo thành công! Vui lòng kiểm tra hộp thư email của bạn để xác thực liên kết trước khi đăng nhập.'
      );
      Alert.alert(
        'Đăng ký thành công',
        'Vui lòng kiểm tra email của bạn để xác nhận tài khoản, sau đó chuyển sang Đăng nhập.'
      );
    } else {
      // Auto logged in via Supabase session
      Alert.alert('Thành công', 'Đăng ký tài khoản hoàn tất!');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoIcon}>🛡️</Text>
            </View>
            <Text style={styles.appName}>HIDDER</Text>
            <Text style={styles.appTagline}>Tạo không gian két bảo mật cá nhân</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Đăng ký tài khoản</Text>
            <Text style={styles.cardSubtitle}>
              Mỗi tài khoản mới sẽ nhận ngay 30 ngày trải nghiệm miễn phí toàn bộ tính năng Cloud & Két bảo mật.
            </Text>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successInfo ? (
              <View style={styles.successBox}>
                <Text style={styles.successIcon}>✉️</Text>
                <Text style={styles.successText}>{successInfo}</Text>
              </View>
            ) : null}

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tenban@example.com"
                placeholderTextColor="#64748B"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMessage) setErrorMessage('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="Tối thiểu 6 ký tự"
                placeholderTextColor="#64748B"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Xác nhận mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập lại mật khẩu"
                placeholderTextColor="#64748B"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              disabled={loading}
              onPress={handleRegister}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <Text style={styles.submitButtonText}>Tạo tài khoản</Text>
              )}
            </TouchableOpacity>

            {/* Navigation Link to Login */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Đã có tài khoản?</Text>
              <TouchableOpacity
                onPress={onNavigateToLogin}
                disabled={loading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.footerLink}>Đăng nhập ngay</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Security Note */}
          <Text style={styles.securityNote}>
            🔒 Dữ liệu tài khoản của bạn được bảo mật tuyệt đối với Supabase Auth. Mật khẩu không bao giờ được lưu plaintext.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  logoIcon: {
    fontSize: 32,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 2,
  },
  appTagline: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
    marginBottom: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    color: '#F87171',
    fontSize: 13,
    lineHeight: 18,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
  },
  successIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  successText: {
    flex: 1,
    color: '#38BDF8',
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
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
    marginBottom: 20,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  footerLink: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  securityNote: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 12,
  },
});
