import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const canUseExpoSecureStore = Platform.OS !== 'web';

export const secureGetItem = async (key) => {
  if (canUseExpoSecureStore) {
    return SecureStore.getItemAsync(key);
  }

  return AsyncStorage.getItem(`secure:${key}`);
};

export const secureSetItem = async (key, value) => {
  if (canUseExpoSecureStore) {
    return SecureStore.setItemAsync(key, value);
  }

  return AsyncStorage.setItem(`secure:${key}`, value);
};

export const secureDeleteItem = async (key) => {
  if (canUseExpoSecureStore) {
    return SecureStore.deleteItemAsync(key);
  }

  return AsyncStorage.removeItem(`secure:${key}`);
};
