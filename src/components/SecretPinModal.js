import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';

export default function SecretPinModal({ visible, onClose, onAttemptUnlock }) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      setPin('');
      setErrorMsg('');
      setLoading(false);
    }
  }, [visible]);

  const handleDigit = (digit) => {
    if (loading) return;
    setErrorMsg('');
    if (pin.length < 8) {
      setPin((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    if (loading) return;
    setErrorMsg('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (loading) return;
    setPin('');
    setErrorMsg('');
  };

  const handleConfirm = async () => {
    if (loading || pin.length < 4) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const mode = await onAttemptUnlock(pin);
      if (mode === 'real' || mode === 'decoy') {
        setPin('');
        setErrorMsg('');
        setLoading(false);
        onClose();
        return;
      }

      // Sai mã
      try {
        Vibration.vibrate(80);
      } catch {
        // Safe fallback
      }
      setErrorMsg('Mã bảo mật không chính xác');
      setPin('');
    } catch {
      setErrorMsg('Không thể mở khóa. Vui lòng thử lại.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.lockIconContainer}>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
            <Text style={styles.title}>Xác thực mã bảo mật</Text>
            <Text style={styles.subtitle}>Nhập mã bí mật để truy cập kho dữ liệu</Text>
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const isFilled = idx < pin.length;
              return (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    isFilled ? styles.dotFilled : styles.dotEmpty,
                  ]}
                />
              );
            })}
          </View>

          {/* Error message */}
          {errorMsg ? (
            <Text style={styles.errorText}>{errorMsg}</Text>
          ) : (
            <View style={styles.errorPlaceholder} />
          )}

          {/* Keypad */}
          <View style={styles.keypad}>
            {[
              ['1', '2', '3'],
              ['4', '5', '6'],
              ['7', '8', '9'],
              ['✕', '0', '⌫'],
            ].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((btn) => {
                  if (btn === '✕') {
                    return (
                      <TouchableOpacity
                        key={btn}
                        style={[styles.keyBtn, styles.actionKeyBtn]}
                        onPress={onClose}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionKeyText}>✕</Text>
                      </TouchableOpacity>
                    );
                  }
                  if (btn === '⌫') {
                    return (
                      <TouchableOpacity
                        key={btn}
                        style={[styles.keyBtn, styles.actionKeyBtn]}
                        onPress={handleDelete}
                        onLongPress={handleClear}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.actionKeyText}>⌫</Text>
                      </TouchableOpacity>
                    );
                  }
                  return (
                    <TouchableOpacity
                      key={btn}
                      style={styles.keyBtn}
                      onPress={() => handleDigit(btn)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.keyText}>{btn}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              pin.length < 4 || loading ? styles.confirmBtnDisabled : null,
            ]}
            onPress={handleConfirm}
            disabled={pin.length < 4 || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmBtnText}>
              {loading ? 'Đang kiểm tra...' : 'Xác nhận mở kho'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  lockIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  lockIcon: {
    fontSize: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
    height: 24,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotEmpty: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dotFilled: {
    backgroundColor: '#3B82F6',
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    height: 20,
  },
  errorPlaceholder: {
    height: 20,
    marginBottom: 16,
  },
  keypad: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  keyBtn: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  actionKeyBtn: {
    backgroundColor: 'transparent',
  },
  actionKeyText: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '600',
  },
  confirmBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#1E293B',
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
