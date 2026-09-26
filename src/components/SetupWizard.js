import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { isValidSecretCode, maskSecretCode } from '../services/crypto';
import DisguiseGuideModal from './DisguiseGuideModal';

const DISGUISE_OPTIONS = [
  {
    key: 'notes',
    label: 'Ghi chú (Notes)',
    description: 'Ngụy trang app ghi chú Apple. Nhấn giữ tiêu đề "Notes" 1.5s để mở két.',
  },
  {
    key: 'calculator',
    label: 'Máy tính (Calculator)',
    description: 'Ngụy trang máy tính số học thật. Nhấn giữ phím "=" 1.2s để mở két.',
  },
  {
    key: 'weather',
    label: 'Thời tiết (Weather)',
    description: 'Ngụy trang app dự báo thời tiết. Nhấn giữ thẻ nhiệt độ 1.5s để mở két.',
  },
  {
    key: 'calendar',
    label: 'Lịch & Sự kiện (Calendar)',
    description: 'Ngụy trang app lịch biểu. Nhấn giữ tiêu đề Tháng/Năm 1.5s để mở két.',
  },
];

export default function SetupWizard({ biometricAvailable, onComplete, onSignOut }) {
  const [step, setStep] = useState(0);
  const [disguise, setDisguise] = useState('notes');
  const [realCode, setRealCode] = useState('');
  const [decoyCode, setDecoyCode] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(Boolean(biometricAvailable));
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showGuideModal, setShowGuideModal] = useState(false);

  const stepTitle = useMemo(() => {
    if (step === 0) return 'Chọn lớp vỏ ngụy trang';
    if (step === 1) return 'Tạo mã thật';
    if (step === 2) return 'Tạo mã giả decoy';
    return 'Hoàn tất cấu hình';
  }, [step]);

  const handleContinue = async () => {
    setErrorMessage('');

    if (step === 1 && !isValidSecretCode(realCode)) {
      setErrorMessage('Mã thật cần ít nhất 4 ký tự.');
      return;
    }

    if (step === 2 && decoyCode.trim() && decoyCode.trim().toLowerCase() === realCode.trim().toLowerCase()) {
      setErrorMessage('Mã giả phải khác mã thật.');
      return;
    }

    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }

    setSubmitting(true);
    const result = await onComplete({
      disguise,
      realCode,
      decoyCode,
      enableBiometric,
    });
    setSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Không thể hoàn tất setup.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/logo.png')} style={styles.smallLogo} resizeMode="contain" />
            <Text style={styles.eyebrow}>Hidder setup</Text>
          </View>
          {onSignOut ? (
            <TouchableOpacity onPress={onSignOut} style={styles.switchAccountBtn} activeOpacity={0.7}>
              <Text style={styles.switchAccountText}>Đổi tài khoản ↪</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.title}>{stepTitle}</Text>
        <Text style={styles.description}>
          Bảo mật cấp thiết bị. Mã PIN và cấu hình ngụy trang được lưu mã hóa an toàn trên thiết bị của bạn.
        </Text>
      </View>

      <View style={styles.stepperRow}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={[styles.stepDot, item <= step ? styles.stepDotActive : null]} />
        ))}
      </View>

      <View style={styles.card}>
        {step === 0 ? (
          DISGUISE_OPTIONS.map((option) => {
            const isSelected = option.key === disguise;
            return (
              <TouchableOpacity
                key={option.key}
                style={[styles.optionCard, isSelected ? styles.optionCardSelected : null]}
                onPress={() => setDisguise(option.key)}
              >
                <Text style={styles.optionTitle}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </TouchableOpacity>
            );
          })
        ) : null}

        {step === 1 ? (
          <>
            <Text style={styles.label}>Mã thật</Text>
            <TextInput
              style={styles.input}
              placeholder={disguise === 'calculator' ? 'Ví dụ: 2468 hoặc 13579' : 'Ví dụ: 2468 hoặc luna.note'}
              placeholderTextColor="#9CA3AF"
              value={realCode}
              onChangeText={setRealCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>
              {disguise === 'calculator'
                ? 'Nhấn giữ phím "=" trên Máy tính (1.2s) để mở hộp thoại mã PIN.'
                : disguise === 'weather'
                ? 'Nhấn giữ thẻ nhiệt độ trung tâm của Thời tiết (1.5s) để mở hộp thoại mã PIN.'
                : disguise === 'calendar'
                ? 'Nhấn giữ tiêu đề Tháng/Năm của Lịch (1.5s) để mở hộp thoại mã PIN.'
                : 'Nhấn giữ tiêu đề "Notes" trên cùng (1.5s) để mở hộp thoại mã PIN.'}
            </Text>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.label}>Mã giả decoy</Text>
            <TextInput
              style={styles.input}
              placeholder="Tùy chọn, có thể bỏ trống"
              placeholderTextColor="#9CA3AF"
              value={decoyCode}
              onChangeText={setDecoyCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>Nếu cần, mã giả sẽ mở một vault vô hại để đánh lạc hướng.</Text>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={styles.summaryTitle}>Tóm tắt cấu hình</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Disguise</Text>
              <Text style={styles.summaryValue}>
                {DISGUISE_OPTIONS.find((o) => o.key === disguise)?.label || disguise}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Mã thật</Text>
              <Text style={styles.summaryValue}>{maskSecretCode(realCode)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Mã giả</Text>
              <Text style={styles.summaryValue}>{decoyCode ? maskSecretCode(decoyCode) : 'Bỏ qua'}</Text>
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={styles.switchTitle}>Bật sinh trắc học</Text>
                <Text style={styles.switchDescription}>
                  {biometricAvailable
                    ? 'Cho phép mở vault thật bằng xác thực thiết bị từ public shell.'
                    : 'Thiết bị hiện không hỗ trợ hoặc chưa cài vân tay/Face ID.'}
                </Text>
              </View>
              <Switch
                value={enableBiometric && biometricAvailable}
                disabled={!biometricAvailable}
                onValueChange={setEnableBiometric}
              />
            </View>

            {/* Quick Unlock Tip */}
            <View style={styles.guideCardTip}>
              <Text style={styles.guideCardTipTitle}>💡 Cách mở: {DISGUISE_OPTIONS.find((o) => o.key === disguise)?.label}</Text>
              <Text style={styles.guideCardTipDesc}>
                {disguise === 'calculator'
                  ? '👉 Nhấn & Giữ phím "=" trong 1.2s -> Xác thực để vào két.'
                  : disguise === 'weather'
                  ? '👉 Nhấn & Giữ thẻ nhiệt độ ở giữa 1.5s -> Xác thực để vào két.'
                  : disguise === 'calendar'
                  ? '👉 Nhấn & Giữ tiêu đề Tháng/Năm 1.5s -> Xác thực để vào két.'
                  : '👉 Nhấn & Giữ tiêu đề "Notes" trên cùng 1.5s -> Xác thực để vào két.'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.openGuideButton}
              onPress={() => setShowGuideModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.openGuideButtonText}>📖 Xem toàn bộ bảng hướng dẫn 4 lớp vỏ</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.footerRow}>
          {step > 0 ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep((current) => current - 1)}>
              <Text style={styles.secondaryButtonText}>Quay lại</Text>
            </TouchableOpacity>
          ) : <View style={styles.buttonSpacer} />}

          <TouchableOpacity style={styles.primaryButton} onPress={handleContinue} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#EFF6FF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>{step === 3 ? 'Hoàn tất' : 'Tiếp tục'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <DisguiseGuideModal
        visible={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    paddingHorizontal: 20,
    paddingTop: 72,
  },
  heroCard: {
    marginBottom: 18,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  eyebrow: {
    color: '#93C5FD',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontSize: 12,
  },
  switchAccountBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  switchAccountText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 32,
    fontWeight: '700',
  },
  description: {
    color: '#94A3B8',
    marginTop: 10,
    lineHeight: 22,
  },
  stepperRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  stepDot: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#1E293B',
  },
  stepDotActive: {
    backgroundColor: '#2563EB',
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.14)',
  },
  optionCard: {
    backgroundColor: '#111C34',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
  },
  optionCardSelected: {
    borderColor: '#60A5FA',
    backgroundColor: '#172554',
  },
  optionTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  optionDescription: {
    color: '#94A3B8',
    lineHeight: 20,
  },
  label: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#111C34',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F8FAFC',
    fontSize: 16,
  },
  helperText: {
    color: '#94A3B8',
    marginTop: 10,
    lineHeight: 20,
  },
  summaryTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.12)',
  },
  summaryLabel: {
    color: '#94A3B8',
  },
  summaryValue: {
    color: '#F8FAFC',
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  switchTextWrap: {
    flex: 1,
  },
  switchTitle: {
    color: '#F8FAFC',
    fontWeight: '700',
    marginBottom: 4,
  },
  switchDescription: {
    color: '#94A3B8',
    lineHeight: 20,
  },
  guideCardTip: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#38BDF8',
  },
  guideCardTipTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  guideCardTipDesc: {
    color: '#93C5FD',
    fontSize: 12,
    lineHeight: 18,
  },
  openGuideButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  openGuideButtonText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    color: '#FCA5A5',
    marginTop: 14,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  buttonSpacer: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#111C34',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primaryButtonText: {
    color: '#EFF6FF',
    fontWeight: '700',
    fontSize: 15,
  },
});
