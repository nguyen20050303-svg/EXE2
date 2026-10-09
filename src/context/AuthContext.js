import React, {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";

import * as LocalAuthentication from "expo-local-authentication";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { NativeModules } from "react-native";

WebBrowser.maybeCompleteAuthSession();

let GoogleSignin;
let statusCodes;
let isNativeAuthAvailable = false;

if (Platform.OS !== "web") {
  try {
    const RNGoogleSignin = require("@react-native-google-signin/google-signin");
    GoogleSignin = RNGoogleSignin.GoogleSignin;
    statusCodes = RNGoogleSignin.statusCodes;

    // Expo Go có thể tải được package JavaScript nhưng không có native module.
    if (NativeModules.RNGoogleSignin || NativeModules.RNGoogleSignInCGen) {
      isNativeAuthAvailable = true;
      const webClientId =
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
        "1035536210869-q8l0fdcm6lspeb68d7tlne38ks5i19ad.apps.googleusercontent.com";
      GoogleSignin.configure({
        scopes: [
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ],
        webClientId,
      });
    }
  } catch (error) {
    console.log(
      "Đang chạy trên Expo Go (hoặc thiếu Native Module), tự động chuyển sang dùng WebBrowser Auth...",
    );
    isNativeAuthAvailable = false;
  }
}
import { ensureSeedData } from "../services/database";
import {
  secureDeleteItem,
  secureGetItem,
  secureSetItem,
} from "../services/secureStorage";
import { supabase } from "../services/supabase";
import {
  getOrInitSubscription,
  getCachedSubscription,
  evaluateAccess,
} from "../services/subscriptionService";
import {
  getOrCreateUserMasterKey,
  clearActiveMasterKey,
} from "../services/crypto";
import { syncAppIconWithDisguise } from "../services/appIcon";

export const AuthContext = createContext(null);

const STORAGE_KEYS = {
  realCode: "hidder.real-code",
  decoyCode: "hidder.decoy-code",
  biometricEnabled: "hidder.biometric-enabled",
  disguiseType: "hidder.disguise-type",
  setupComplete: "hidder.setup-complete",
};

const normalizeCode = (value) => value?.trim().toLowerCase() ?? "";

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
    throw new Error("Cần userId để lưu dữ liệu SecureStore.");
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
  const [disguiseType, setDisguiseType] = useState("notes");
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
      console.warn("Lỗi kiểm tra subscription:", err);
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
      setDisguiseType("notes");
      setBiometricEnabled(false);
      return;
    }

    try {
      const userId = user.id;
      const [setupVal, disguiseVal, bioVal] = await Promise.all([
        getUserSecureItem("setupComplete", userId),
        getUserSecureItem("disguiseType", userId),
        getUserSecureItem("biometricEnabled", userId),
      ]);

      setIsSetupComplete(setupVal === "true");
      setDisguiseType(disguiseVal || "notes");
      setBiometricEnabled(bioVal === "true");

      if (setupVal === "true" && disguiseVal) {
        void syncAppIconWithDisguise(disguiseVal);
      }
    } catch (err) {
      console.warn("Lỗi tải setup state cho user:", err);
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
            console.warn("Lỗi nạp setup/subscription/crypto ban đầu:", subErr);
          }
        } else {
          clearActiveMasterKey();
          setIsSetupComplete(false);
        }
      } catch (error) {
        console.error("Bootstrap Hidder thất bại:", error);
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
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" && !isPickerActiveRef.current) {
        setIsUnlocked(false);
        setActiveVaultMode(null);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const completeSetup = async ({
    realCode,
    decoyCode,
    enableBiometric,
    disguise,
  }) => {
    const normalizedRealCode = normalizeCode(realCode);
    const normalizedDecoyCode = normalizeCode(decoyCode);
    const userId = currentUser?.id;

    if (!normalizedRealCode || normalizedRealCode.length < 4) {
      return { success: false, error: "Mã thật cần ít nhất 4 ký tự." };
    }

    if (normalizedDecoyCode && normalizedDecoyCode === normalizedRealCode) {
      return { success: false, error: "Mã giả phải khác mã thật." };
    }

    try {
      await setUserSecureItem("realCode", userId, normalizedRealCode);

      if (normalizedDecoyCode) {
        await setUserSecureItem("decoyCode", userId, normalizedDecoyCode);
      } else {
        await deleteUserSecureItem("decoyCode", userId);
      }

      await setUserSecureItem(
        "biometricEnabled",
        userId,
        enableBiometric ? "true" : "false",
      );
      await setUserSecureItem("disguiseType", userId, disguise || "notes");
      await setUserSecureItem("setupComplete", userId, "true");

      setBiometricEnabled(Boolean(enableBiometric));
      setDisguiseType(disguise || "notes");
      setIsSetupComplete(true);

      // Đồng bộ icon ứng dụng ngoài màn hình chính điện thoại
      void syncAppIconWithDisguise(disguise || "notes");

      return { success: true };
    } catch (error) {
      console.error("Lỗi hoàn tất setup:", error);
      return { success: false, error: "Không thể lưu cấu hình bảo mật." };
    }
  };

  const attemptUnlock = async (input) => {
    try {
      const userId = currentUser?.id;
      const [realCode, decoyCode] = await Promise.all([
        getUserSecureItem("realCode", userId),
        getUserSecureItem("decoyCode", userId),
      ]);

      const normalizedInput = normalizeCode(input);

      if (normalizedInput && normalizedInput === normalizeCode(realCode)) {
        setIsUnlocked(true);
        setActiveVaultMode("real");
        return "real";
      }

      if (
        normalizedInput &&
        decoyCode &&
        normalizedInput === normalizeCode(decoyCode)
      ) {
        setIsUnlocked(true);
        setActiveVaultMode("decoy");
        return "decoy";
      }

      return "none";
    } catch (error) {
      console.error("Lỗi mở khóa local:", error);
      return "none";
    }
  };

  const authenticateBiometric = async () => {
    if (!biometricAvailable || !biometricEnabled) {
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Xác thực để vào Hidder",
        cancelLabel: "Hủy",
        fallbackLabel: "Dùng mã bí mật",
      });

      if (result.success) {
        setIsUnlocked(true);
        setActiveVaultMode("real");
        return true;
      }

      return false;
    } catch (error) {
      console.error("Lỗi sinh trắc học:", error);
      return false;
    }
  };

  const lockVault = () => {
    setIsUnlocked(false);
    setActiveVaultMode(null);
  };

  const signInWithGoogleOAuth = async () => {
    try {
      // NẾU ĐANG CHẠY WEB HOẶC EXPO GO: Dùng WebBrowser (cách cũ)
      if (Platform.OS === "web" || !isNativeAuthAvailable) {
        if (Platform.OS === "web") {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: window.location.origin },
          });
          if (error) return { success: false, error: error.message };
          return { success: true };
        }

        // Tự động lấy URL chính xác tuỳ theo môi trường (bỏ hoàn toàn proxy)
        // - Nếu chạy Expo Go: Lấy đúng IP Wifi hiện tại (vd: exp://192.168.X.X:8081/--/auth)
        // - Nếu App thật: Lấy đúng scheme của app (vd: hidder://auth)
        let redirectUrl = "hidder://auth";
        try {
          redirectUrl = Linking.createURL("auth", { scheme: "hidder" }) || "hidder://auth";
        } catch {
          redirectUrl = "hidder://auth";
        }

        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
        });

        if (error) return { success: false, error: error.message };

        console.log("=== OAUTH DEBUG ===");
        console.log("Redirect URL:", redirectUrl);
        console.log("Supabase URL:", data.url);

        const res = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
        );
        if (res.type === "success" && res.url) {
          const params = {};
          const hash = res.url.split("#")[1];
          if (hash)
            new URLSearchParams(hash).forEach((value, key) => {
              params[key] = value;
            });
          const query = res.url.split("?")[1]?.split("#")[0];
          if (query)
            new URLSearchParams(query).forEach((value, key) => {
              params[key] = value;
            });

          if (params.error_description || params.error) {
            return {
              success: false,
              error: params.error_description || params.error,
            };
          }

          if (params.code) {
            const { data: codeData, error: codeError } =
              await supabase.auth.exchangeCodeForSession(params.code);
            if (codeError) return { success: false, error: codeError.message };
            if (codeData?.session) return { success: true };
          }

          if (params.access_token && params.refresh_token) {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token,
              });
            if (sessionError)
              return { success: false, error: sessionError.message };
            if (sessionData?.session) return { success: true };
          }

          const { data: currentSession } = await supabase.auth.getSession();
          if (currentSession?.session) return { success: true };
          return { success: false, error: "Không lấy được phiên đăng nhập." };
        }
        return { success: false, error: "Đăng nhập bị huỷ." };
      }

      // 1. NẾU LÀ APP THẬT (ĐÃ BUILD APK/IPA): Dùng Google One Tap siêu nhanh
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // 2. Hiện popup đăng nhập Google của hệ điều hành
      const userInfo = await GoogleSignin.signIn();

      if (userInfo?.type === "cancelled") {
        return { success: false, error: "Người dùng đã huỷ đăng nhập." };
      }

      // 3. Lấy idToken từ thông tin đăng nhập
      const idToken = userInfo?.data?.idToken || userInfo?.idToken;

      if (!idToken) {
        throw new Error("Không lấy được idToken từ Google.");
      }

      // 4. Gửi idToken cho Supabase để xác thực và tạo session
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.log("Lỗi Native Google Sign-In:", error);

      let errMsg = error.message;
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        errMsg = "Người dùng đã huỷ đăng nhập.";
      } else if (error.code === statusCodes.IN_PROGRESS) {
        errMsg = "Đang trong quá trình đăng nhập.";
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        errMsg = "Google Play Services không khả dụng trên thiết bị này.";
      }

      return { success: false, error: errMsg };
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
      await setUserSecureItem("disguiseType", userId, type);
      setDisguiseType(type);

      // Đồng bộ icon ứng dụng ngoài màn hình chính điện thoại
      void syncAppIconWithDisguise(type);

      return true;
    } catch (err) {
      console.error("Lỗi đổi vỏ ngụy trang:", err);
      return false;
    }
  };

  const reauthenticateWithPassword = async (password) => {
    if (!currentUser?.email) {
      return { success: false, error: "Chưa đăng nhập tài khoản." };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password,
      });

      if (error) {
        return { success: false, error: "Mật khẩu tài khoản không chính xác." };
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
      return { success: false, error: "Mã thật cần ít nhất 4 ký tự." };
    }
    try {
      const userId = currentUser?.id;
      const decoy = await getUserSecureItem("decoyCode", userId);
      if (decoy && normalizeCode(decoy) === normalized) {
        return {
          success: false,
          error: "Mã thật không được trùng với mã mồi Decoy.",
        };
      }
      await setUserSecureItem("realCode", userId, normalized);
      return { success: true };
    } catch (err) {
      return { success: false, error: "Không thể cập nhật Real PIN." };
    }
  };

  const updateDecoyCode = async (newCode) => {
    const normalized = normalizeCode(newCode);
    const userId = currentUser?.id;
    try {
      if (!normalized) {
        await deleteUserSecureItem("decoyCode", userId);
        return { success: true };
      }
      const real = await getUserSecureItem("realCode", userId);
      if (real && normalizeCode(real) === normalized) {
        return { success: false, error: "Mã mồi Decoy phải khác mã thật." };
      }
      await setUserSecureItem("decoyCode", userId, normalized);
      return { success: true };
    } catch (err) {
      return { success: false, error: "Không thể cập nhật Decoy PIN." };
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
      await setUserSecureItem(
        "biometricEnabled",
        userId,
        enabled ? "true" : "false",
      );
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
      signInWithGoogleOAuth,
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
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
