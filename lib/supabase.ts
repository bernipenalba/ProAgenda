import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY — check your .env.local file.'
  );
}

// On native, use iOS Keychain / Android Keystore (encrypted at rest).
// On web, use sessionStorage instead of Supabase's default localStorage so the
// tokens are not readable by scripts after the tab closes. sessionStorage is
// still accessible to JS on the same page (same XSS risk as localStorage), but
// it limits exposure window to the browser session and is never persisted to
// disk by the browser.
const SecureStoreAdapter = Platform.OS !== 'web'
  ? {
      getItem: (key: string) => SecureStore.getItemAsync(key),
      setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
      removeItem: (key: string) => SecureStore.deleteItemAsync(key),
    }
  : typeof sessionStorage !== 'undefined'
    ? {
        getItem: (key: string) => sessionStorage.getItem(key),
        setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
        removeItem: (key: string) => sessionStorage.removeItem(key),
      }
    : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // Detect access_token from URL hash on web (browser only, not during SSR).
    detectSessionInUrl: Platform.OS === 'web' && typeof window !== 'undefined',
  },
});
