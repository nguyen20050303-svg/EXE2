import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { isValidSecretCode, maskSecretCode } from '../services/crypto';

const DISGUISE_OPTIONS = [
  {
    key: 'notes',
    label: 'Notes',
    description: 'Lớp vỏ nhẹ nhất cho MVP, hỗ trợ trigger qua ô tìm kiếm.',
  },
];

export default function SetupWizard({ biometricAvailable, onComplete }) {
  const [step, setStep] = useState(0);
  const [disguise, setDisguise] = useState('notes');
  const [realCode, setRealCode] = useState('');
  const [decoyCode, setDecoyCode] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(Boolean(biometricAvailable));
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

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
        <Text style={styles.eyebrow}>Hidder setup</Text>
        <Text style={styles.title}>{stepTitle}</Text>
        <Text style={styles.description}>
          Local-first, không cần tài khoản. Mọi cấu hình trong bản này được lưu trên thiết bị.
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
              placeholder="Ví dụ: 2468 hoặc luna.note"
              placeholderTextColor="#9CA3AF"
              value={realCode}
              onChangeText={setRealCode}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.helperText}>Mã này sẽ mở vault thật khi nhập trong ô tìm kiếm của Notes.</Text>
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
              <Text style={styles.summaryValue}>Notes</Text>
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
  eyebrow: {
    color: '#93C5FD',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontSize: 12,
    marginBottom: 10,
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
