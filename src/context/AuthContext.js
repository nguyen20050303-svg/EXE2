import React, { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import * as LocalAuthentication from 'expo-local-authentication';
import { ensureSeedData } from '../services/database';
import { secureDeleteItem, secureGetItem, secureSetItem } from '../services/secureStorage';
import { supabase } from '../services/supabase';
import { getOrInitSubscription, getCachedSubscription, evaluateAccess } from '../services/subscriptionService';
import { getOrCreateUserMasterKey, clearActiveMasterKey } from '../services/crypto';

export const AuthContext = createContext(null);

const STORAGE_KEYS = {
  realCode: 'hidder.real-code',
  decoyCode: 'hidder.decoy-code',
  biometricEnabled: 'hidder.biometric-enabled',
  disguiseType: 'hidder.disguise-type',
  setupComplete: 'hidder.setup-complete',
};

const normalizeCode = (value) => value?.trim().toLowerCase() ?? '';

// Helpers for Account-Isolated SecureStore keys
const getUserSecureItem = async (keyName, userId) => {
  if (!userId) return null;
  const userKey = `${STORAGE_KEYS[keyName]}.${userId}`;
  let val = await secureGetItem(userKey);

  // Migration fallback: If user key doesn't exist yet, check legacy global key
  if (val === null) {
    const legacyKey = STORAGE_KEYS[keyName];
    val = await secureGetItem(legacyKey);
  }
  return val;
};

const setUserSecureItem = async (keyName, userId, value) => {
  if (!userId) {
    throw new Error('Cần userId để lưu dữ liệu SecureStore.');
  }
  const userKey = `${STORAGE_KEYS[keyName]}.${userId}`;
  await secureSetItem(userKey, value);
};

const deleteUserSecureItem = async (keyName, userId) => {
  if (!userId) return;
  const userKey = `${STORAGE_KEYS[keyName]}.${userId}`;
  await secureDeleteItem(userKey);
};

export const AuthProvider = ({ children }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [activeVaultMode, setActiveVaultMode] = useState(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [disguiseType, setDisguiseType] = useState('notes');
  const [currentUser, setCurrentUser] = useState(null);
  const [session, setSession] = useState(null);

  // Ref to prevent Auto-Lock when system Media / Document pickers are open
  const isPickerActiveRef = useRef(false);

  const setPickerActive = (active) => {
    isPickerActiveRef.current = Boolean(active);
  };

  // Phase 2: Subscription states
  const [subscription, setSubscription] = useState(null);
  const [subscriptionAccess, setSubscriptionAccess] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  const checkSubscription = async (user) => {
    if (!user) {
      setSubscription(null);
      setSubscriptionAccess(null);
      setSubscriptionLoading(false);
      return;
    }

    try {
      setSubscriptionLoading(true);
      const res = await getOrInitSubscription(user);
      setSubscription(res.subscription);
      setSubscriptionAccess(res.access);
    } catch (err) {
      console.warn('Lỗi kiểm tra subscription:', err);
      const cached = await getCachedSubscription(user?.id);
      const fallbackAccess = evaluateAccess(cached);
      setSubscription(cached);
      setSubscriptionAccess(fallbackAccess);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const refreshSubscription = async () => {
    if (currentUser) {
      await checkSubscription(currentUser);
    }
  };

  const loadUserSetupState = async (user) => {
    if (!user?.id) {
      setIsSetupComplete(false);
      setDisguiseType('notes');
      setBiometricEnabled(false);
      return;
    }

    try {
      const userId = user.id;
      const [setupVal, disguiseVal, bioVal] = await Promise.all([
        getUserSecureItem('setupComplete', userId),
        getUserSecureItem('disguiseType', userId),
        getUserSecureItem('biometricEnabled', userId),
      ]);

      setIsSetupComplete(setupVal === 'true');
      setDisguiseType(disguiseVal || 'notes');
      setBiometricEnabled(bioVal === 'true');
    } catch (err) {
      console.warn('Lỗi tải setup state cho user:', err);
      setIsSetupComplete(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        await ensureSeedData();

        const [compatible, enrolled, sessionRes] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          supabase.auth.getSession(),
        ]);

        if (!mounted) return;

        setBiometricAvailable(Boolean(compatible && enrolled));

        const initialSession = sessionRes?.data?.session ?? null;
        setSession(initialSession);
        const initialUser = initialSession?.user ?? null;
        setCurrentUser(initialUser);

        if (initialUser) {
          try {
            await Promise.all([
              loadUserSetupState(initialUser),
              getOrCreateUserMasterKey(initialUser.id),
              getOrInitSubscription(initialUser).then((subRes) => {
                if (mounted) {
                  setSubscription(subRes.subscription);
                  setSubscriptionAccess(subRes.access);
                }
              }),
            ]);
          } catch (subErr) {
            console.warn('Lỗi nạp setup/subscription/crypto ban đầu:', subErr);
          }
        } else {
          clearActiveMasterKey();
          setIsSetupComplete(false);
        }
      } catch (error) {
        console.error('Bootstrap Hidder thất bại:', error);
      } finally {
        if (mounted) {
          setIsInitializing(false);
        }
      }
    };

    bootstrap();

    // Lắng nghe thay đổi trạng thái đăng nhập của Supabase
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (mounted) {
        setSession(newSession ?? null);
        const nextUser = newSession?.user ?? null;

        setCurrentUser((prevUser) => {
          // If the user ID has not changed (e.g. session refresh or reauthentication),
          // don't re-trigger full bootstrap which could flash loading screens
          if (prevUser?.id && nextUser?.id && prevUser.id === nextUser.id) {
            return nextUser;
          }

          if (nextUser) {
            // SIGNED_IN event fires after email confirmation link is clicked.
            // At this point prevUser is null (new tab opened from email),
            // so we must run the full bootstrap here.
            void checkSubscription(nextUser);
            void loadUserSetupState(nextUser);
            void getOrCreateUserMasterKey(nextUser.id);
          } else {
            clearActiveMasterKey();
            setSubscription(null);
            setSubscriptionAccess(null);
            setIsSetupComplete(false);
            setIsUnlocked(false);
            setActiveVaultMode(null);
          }
          return nextUser;
        });
      }
    });

    return () => {
      mounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active' && !isPickerActiveRef.current) {
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
    const userId = currentUser?.id;

    if (!normalizedRealCode || normalizedRealCode.length < 4) {
      return { success: false, error: 'Mã thật cần ít nhất 4 ký tự.' };
    }

    if (normalizedDecoyCode && normalizedDecoyCode === normalizedRealCode) {
      return { success: false, error: 'Mã giả phải khác mã thật.' };
    }

    try {
      await setUserSecureItem('realCode', userId, normalizedRealCode);

      if (normalizedDecoyCode) {
        await setUserSecureItem('decoyCode', userId, normalizedDecoyCode);
      } else {
        await deleteUserSecureItem('decoyCode', userId);
      }

      await setUserSecureItem('biometricEnabled', userId, enableBiometric ? 'true' : 'false');
      await setUserSecureItem('disguiseType', userId, disguise || 'notes');
      await setUserSecureItem('setupComplete', userId, 'true');

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
      const userId = currentUser?.id;
      const [realCode, decoyCode] = await Promise.all([
        getUserSecureItem('realCode', userId),
        getUserSecureItem('decoyCode', userId),
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

  const signInWithEmail = async (email, password) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      setSession(data.session ?? null);
      setCurrentUser(data.user ?? null);
      if (data.user) {
        await Promise.all([
          checkSubscription(data.user),
          loadUserSetupState(data.user),
          getOrCreateUserMasterKey(data.user.id),
        ]);
      }
      return { success: true, user: data.user, session: data.session };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const signUpWithEmail = async (email, password) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      // On web, redirect back to the current app URL so Supabase can embed the
      // confirmation token in the URL hash and detectSessionInUrl can pick it up.
      const emailRedirectTo =
        Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin
          : undefined;

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: emailRedirectTo ? { emailRedirectTo } : undefined,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const needsConfirmation = !data.session;

      // Only set session and currentUser if session was created (email confirmation off or auto-confirmed)
      if (data.session && data.user) {
        setSession(data.session);
        setCurrentUser(data.user);
        await Promise.all([
          checkSubscription(data.user),
          loadUserSetupState(data.user),
          getOrCreateUserMasterKey(data.user.id),
        ]);
      } else {
        setSession(null);
        setCurrentUser(null);
      }

      return {
        success: true,
        user: data.user,
        session: data.session,
        needsConfirmation,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const signOutUser = async () => {
    try {
      clearActiveMasterKey();
      await supabase.auth.signOut();
      setSession(null);
      setCurrentUser(null);
      setSubscription(null);
      setSubscriptionAccess(null);
      setSubscriptionLoading(false);
      setIsSetupComplete(false);
      setIsUnlocked(false);
      setActiveVaultMode(null);
      return { success: true };
    } catch (err) {
      clearActiveMasterKey();
      return { success: false, error: err.message };
    }
  };

  const changeDisguiseType = async (type) => {
    try {
      const userId = currentUser?.id;
      await setUserSecureItem('disguiseType', userId, type);
      setDisguiseType(type);
      return true;
    } catch (err) {
      console.error('Lỗi đổi vỏ ngụy trang:', err);
      return false;
    }
  };

  const reauthenticateWithPassword = async (password) => {
    if (!currentUser?.email) {
      return { success: false, error: 'Chưa đăng nhập tài khoản.' };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password,
      });

      if (error) {
        return { success: false, error: 'Mật khẩu tài khoản không chính xác.' };
      }

      setSession(data.session ?? null);
      setCurrentUser(data.user ?? null);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const updateRealCode = async (newCode) => {
    const normalized = normalizeCode(newCode);
    if (!normalized || normalized.length < 4) {
      return { success: false, error: 'Mã thật cần ít nhất 4 ký tự.' };
    }
    try {
      const userId = currentUser?.id;
      const decoy = await getUserSecureItem('decoyCode', userId);
      if (decoy && normalizeCode(decoy) === normalized) {
        return { success: false, error: 'Mã thật không được trùng với mã mồi Decoy.' };
      }
      await setUserSecureItem('realCode', userId, normalized);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Không thể cập nhật Real PIN.' };
    }
  };

  const updateDecoyCode = async (newCode) => {
    const normalized = normalizeCode(newCode);
    const userId = currentUser?.id;
    try {
      if (!normalized) {
        await deleteUserSecureItem('decoyCode', userId);
        return { success: true };
      }
      const real = await getUserSecureItem('realCode', userId);
      if (real && normalizeCode(real) === normalized) {
        return { success: false, error: 'Mã mồi Decoy phải khác mã thật.' };
      }
      await setUserSecureItem('decoyCode', userId, normalized);
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Không thể cập nhật Decoy PIN.' };
    }
  };

  const recoverRealPinWithAccount = async ({ accountPassword, newPin }) => {
    const authRes = await reauthenticateWithPassword(accountPassword);
    if (!authRes.success) {
      return authRes;
    }
    return updateRealCode(newPin);
  };

  const updateBiometricSetting = async (enabled) => {
    try {
      const userId = currentUser?.id;
      await setUserSecureItem('biometricEnabled', userId, enabled ? 'true' : 'false');
      setBiometricEnabled(Boolean(enabled));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
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
      currentUser,
      session,
      subscription,
      subscriptionAccess,
      subscriptionLoading,
      refreshSubscription,
      completeSetup,
      attemptUnlock,
      authenticateBiometric,
      lockVault,
      setPickerActive,
      changeDisguiseType,
      reauthenticateWithPassword,
      updateRealCode,
      updateDecoyCode,
      recoverRealPinWithAccount,
      updateBiometricSetting,
      signInWithEmail,
      signUpWithEmail,
      signOutUser,
    }),
    [
      activeVaultMode,
      biometricAvailable,
      biometricEnabled,
      currentUser,
      session,
      subscription,
      subscriptionAccess,
      subscriptionLoading,
      disguiseType,
      isInitializing,
      isSetupComplete,
      isUnlocked,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
