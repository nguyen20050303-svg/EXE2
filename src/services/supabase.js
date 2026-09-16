import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://gkbeywmdajjencczncdv.supabase.co';
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYmV5d21kYWpqZW5jY3puY2R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MTQyOTksImV4cCI6MjEwNDA5MDI5OX0.Lr47Hlc5o3Kkaz0qnRIkUwHCarL3rDp8tKUGub_astw';

const customStorage = {
  getItem: (key) => (typeof AsyncStorage?.getItem === 'function' ? AsyncStorage.getItem(key) : Promise.resolve(null)),
  setItem: (key, value) => (typeof AsyncStorage?.setItem === 'function' ? AsyncStorage.setItem(key, value) : Promise.resolve()),
  removeItem: (key) => (typeof AsyncStorage?.removeItem === 'function' ? AsyncStorage.removeItem(key) : Promise.resolve()),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
