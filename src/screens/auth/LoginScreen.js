import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';

export default function LoginScreen() {
  const { signInWithGoogleOAuth } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setErrorMessage('');
      setLoading(true);

      const result = await signInWithGoogleOAuth();
      if (!result.success) {
        setErrorMessage(result.error);
      }
    } catch (error) {
      setErrorMessage(error.message || 'Lỗi đăng nhập Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B1120" />
      <View style={styles.container}>
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.appTagline}>Stealth Vault & Private Storage</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Đăng nhập</Text>
          <Text style={styles.cardSubtitle}>
            Xác thực tài khoản để truy cập không gian két bảo mật cá nhân của bạn.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Google Login Button */}
          <TouchableOpacity
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            disabled={loading}
            onPress={handleGoogleLogin}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0F172A" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Tiếp tục với Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B1120' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  brandContainer: { alignItems: 'center', marginBottom: 28 },
  brandLogo: { width: 80, height: 80, marginBottom: 12 },
  appTagline: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  card: { backgroundColor: '#1E293B', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  cardTitle: { color: '#F8FAFC', fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  cardSubtitle: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  errorBox: { flexDirection: 'row', backgroundColor: '#450a0a', padding: 12, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  errorIcon: { fontSize: 16, marginRight: 8 },
  errorText: { color: '#fca5a5', fontSize: 13, flex: 1 },
  googleButton: { flexDirection: 'row', backgroundColor: '#F8FAFC', paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  googleIcon: { fontSize: 18, fontWeight: 'bold', color: '#0F172A', marginRight: 10 },
  googleButtonText: { color: '#0F172A', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.7 },
});
