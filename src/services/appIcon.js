import { AppState, Platform } from "react-native";

let DynamicAppIconModule = null;

try {
  DynamicAppIconModule = require("@howincodes/expo-dynamic-app-icon");
} catch (e) {
  // Graceful fallback for web/testing/unsupported environments
}

// Global flag to prevent changing launcher icon / activity alias while user is in a system picker
let _isPickerActive = false;

export const setAppIconPickerActive = (active) => {
  _isPickerActive = Boolean(active);
};

export const isAppIconPickerActive = () => _isPickerActive;

/**
 * Synchronize device home screen app icon with the user's active disguise shell.
 * @param {string} disguiseType - 'calculator' | 'notes' | 'weather' | 'calendar'
 */
export const syncAppIconWithDisguise = async (disguiseType) => {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return false;
  }

  if (!DynamicAppIconModule?.setAppIcon) {
    return false;
  }

  try {
    const validDisguises = ["calculator", "notes", "weather", "calendar"];
    const targetIcon = validDisguises.includes(disguiseType)
      ? disguiseType
      : null;

    // Tránh đổi lại nếu icon hiện tại đã khớp (tránh Android kill process khi không cần thiết)
    const currentIcon = await getCurrentAppIcon();
    if (currentIcon && targetIcon && currentIcon.toLowerCase() === targetIcon.toLowerCase()) {
      return true;
    }

    // Apply as soon as the app enters the background so the launcher label and icon
    // switch together when the user returns to the Home screen.
    const res = await DynamicAppIconModule.setAppIcon(targetIcon, false);

    // Retry once on the real background transition. Some Android launchers only
    // refresh launcher aliases after the activity has actually paused.
    if (AppState.currentState === "active") {
      let retried = false;
      const subscription = AppState.addEventListener("change", async (state) => {
        if (!retried && state === "background") {
          // QUAN TRỌNG: Nếu đang mở picker hệ thống (chọn ảnh/tài liệu/video),
          // TUYỆT ĐỐI không đổi alias lúc này vì Android OS sẽ kill process app!
          if (_isPickerActive) {
            return;
          }
          const nowCurrent = await getCurrentAppIcon();
          if (nowCurrent && targetIcon && nowCurrent.toLowerCase() === targetIcon.toLowerCase()) {
            retried = true;
            subscription.remove();
            return;
          }
          retried = true;
          subscription.remove();
          void DynamicAppIconModule.setAppIcon(targetIcon, false);
        }
      });
    }

    return Boolean(res);
  } catch (err) {
    console.warn(
      "[appIcon] Không thể đổi icon ngoài màn hình chính:",
      err?.message || err,
    );
    return false;
  }
};

/**
 * Get current active native app icon name.
 */
export const getCurrentAppIcon = async () => {
  if (Platform.OS !== "android" && Platform.OS !== "ios") {
    return "DEFAULT";
  }

  if (!DynamicAppIconModule?.getAppIcon) {
    return "DEFAULT";
  }

  try {
    return await DynamicAppIconModule.getAppIcon();
  } catch {
    return "DEFAULT";
  }
};
