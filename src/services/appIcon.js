import { Platform } from 'react-native';

let DynamicAppIconModule = null;

try {
  DynamicAppIconModule = require('@howincodes/expo-dynamic-app-icon');
} catch (e) {
  // Graceful fallback for web/testing/unsupported environments
}

/**
 * Synchronize device home screen app icon with the user's active disguise shell.
 * @param {string} disguiseType - 'calculator' | 'notes' | 'weather' | 'calendar'
 */
export const syncAppIconWithDisguise = async (disguiseType) => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return false;
  }

  if (!DynamicAppIconModule?.setAppIcon) {
    return false;
  }

  try {
    const validDisguises = ['calculator', 'notes', 'weather', 'calendar'];
    const targetIcon = validDisguises.includes(disguiseType) ? disguiseType : null;

    // isInBackground: true allows seamless icon switch when user minimizes the app to Home Screen
    const res = await DynamicAppIconModule.setAppIcon(targetIcon, true);
    return Boolean(res);
  } catch (err) {
    console.warn('[appIcon] Không thể đổi icon ngoài màn hình chính:', err?.message || err);
    return false;
  }
};

/**
 * Get current active native app icon name.
 */
export const getCurrentAppIcon = async () => {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return 'DEFAULT';
  }

  if (!DynamicAppIconModule?.getAppIcon) {
    return 'DEFAULT';
  }

  try {
    return await DynamicAppIconModule.getAppIcon();
  } catch {
    return 'DEFAULT';
  }
};
