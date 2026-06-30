import React, { createContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { ensureSeedData } from '../services/database';
import { secureDeleteItem, secureGetItem, secureSetItem } from '../services/secureStorage';

export const AuthContext = createContext(null);

const STORAGE_KEYS = {
  realCode: 'hidder.real-code',
  decoyCode: 'hidder.decoy-code',
  biometricEnabled: 'hidder.biometric-enabled',
  disguiseType: 'hidder.disguise-type',
  setupComplete: 'hidder.setup-complete',
};

const normalizeCode = (value) => value?.trim().toLowerCase() ?? '';

export const AuthProvider = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeVaultMode, setActiveVaultMode] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [disguiseType, setDisguiseType] = useState('notes');

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        await ensureSeedData();

        const [
          setupCompleteValue,
          disguiseValue,
          biometricEnabledValue,
          compatible,
          enrolled,
        ] = await Promise.all([
          secureGetItem(STORAGE_KEYS.setupComplete),
          secureGetItem(STORAGE_KEYS.disguiseType),
          secureGetItem(STORAGE_KEYS.biometricEnabled),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);

        if (!mounted) return;

        setIsSetupComplete(setupCompleteValue === 'true');
        setDisguiseType(disguiseValue || 'notes');
        setBiometricEnabled(biometricEnabledValue === 'true');
        setBiometricAvailable(Boolean(compatible && enrolled));
      } catch (error) {
        console.error('Bootstrap Hidder thất bại:', error);
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        setIsUnlocked(false);
        setActiveVaultMode(null);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const completeSetup = async ({ realCode, decoyCode, enableBiometric, disguise }) => {
    const normalizedRealCode = normalizeCode(realCode);
    const normalizedDecoyCode = normalizeCode(decoyCode);

    if (!normalizedRealCode || normalizedRealCode.length < 4) {
      return { success: false, error: 'Mã thật cần ít nhất 4 ký tự.' };
    }

    if (normalizedDecoyCode && normalizedDecoyCode === normalizedRealCode) {
      return { success: false, error: 'Mã giả phải khác mã thật.' };
    }

    try {
      await secureSetItem(STORAGE_KEYS.realCode, normalizedRealCode);

      if (normalizedDecoyCode) {
        await secureSetItem(STORAGE_KEYS.decoyCode, normalizedDecoyCode);
      } else {
        await secureDeleteItem(STORAGE_KEYS.decoyCode);
      }

      await secureSetItem(STORAGE_KEYS.biometricEnabled, enableBiometric ? 'true' : 'false');
      await secureSetItem(STORAGE_KEYS.disguiseType, disguise || 'notes');
      await secureSetItem(STORAGE_KEYS.setupComplete, 'true');

      setBiometricEnabled(Boolean(enableBiometric));
      setDisguiseType(disguise || 'notes');
      setIsSetupComplete(true);

      return { success: true };
    } catch (error) {
      console.error('Lỗi hoàn tất setup:', error);
      return { success: false, error: 'Không thể lưu cấu hình bảo mật.' };
    }
  };

  const attemptUnlock = async (input) => {
    try {
      const [realCode, decoyCode] = await Promise.all([
        secureGetItem(STORAGE_KEYS.realCode),
        secureGetItem(STORAGE_KEYS.decoyCode),
      ]);

      const normalizedInput = normalizeCode(input);

      if (normalizedInput && normalizedInput === normalizeCode(realCode)) {
        setIsUnlocked(true);
        setActiveVaultMode('real');
        return 'real';
      }

      if (normalizedInput && decoyCode && normalizedInput === normalizeCode(decoyCode)) {
        setIsUnlocked(true);
        setActiveVaultMode('decoy');
        return 'decoy';
      }

      return 'none';
    } catch (error) {
      console.error('Lỗi mở khóa local:', error);
      return 'none';
    }
  };

  const authenticateBiometric = async () => {
    if (!biometricAvailable || !biometricEnabled) {
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Xác thực để vào Hidder',
        cancelLabel: 'Hủy',
        fallbackLabel: 'Dùng mã bí mật',
      });

      if (result.success) {
        setIsUnlocked(true);
        setActiveVaultMode('real');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Lỗi sinh trắc học:', error);
      return false;
    }
  };

  const lockVault = () => {
    setIsUnlocked(false);
    setActiveVaultMode(null);
  };

  const value = useMemo(
    () => ({
      isInitializing,
      isSetupComplete,
      isUnlocked,
      activeVaultMode,
      biometricAvailable,
      biometricEnabled,
      disguiseType,
      completeSetup,
      attemptUnlock,
      authenticateBiometric,
      lockVault,
    }),
    [
      activeVaultMode,
      biometricAvailable,
      biometricEnabled,
      disguiseType,
      isInitializing,
      isSetupComplete,
      isUnlocked,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
