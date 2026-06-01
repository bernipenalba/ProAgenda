import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, router, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, ReactNode } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AppProvider } from '@/context/AppContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

// In-memory only — no AsyncStorage persistence.
// Patient data (clinical notes, financials) is too sensitive to write to disk
// in plaintext. Data fetches fresh on app open (Supabase queries are fast).
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,   // fresh for 5 min — no refetch while app is active
      gcTime: 1000 * 60 * 30,     // keep unused data in memory for 30 min max
      retry: 2,
    },
  },
});

// Routes that don't require authentication. Everything else is treated as
// protected — new routes are secure by default without updating this list.
const PUBLIC_ROUTES = new Set(['login', 'forgot-password', 'reset-password', '+not-found']);

// Supabase implicit-flow link types actually used by this app.
// Any #access_token= deep link whose 'type' is NOT in this set is ignored.
// 'recovery'     = password reset link
// 'signup'       = email confirmation after registration
// 'email_change' = confirmation of an email address change
const ACCEPTED_LINK_TYPES = new Set(['recovery', 'signup', 'email_change']);

// Redirects unauthenticated users away from protected routes and wipes the
// in-memory React Query cache the moment a session ends, so no patient data
// remains readable in memory after logout.
function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const wasAuthRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    const isPublic = !segments[0] || PUBLIC_ROUTES.has(segments[0] as string);

    if (session) {
      wasAuthRef.current = true;
    } else {
      // Transition: authenticated → unauthenticated (logout or session expiry).
      // Clear all cached patient data from memory immediately.
      if (wasAuthRef.current) {
        queryClient.clear();
        wasAuthRef.current = false;
      }
      if (!isPublic) {
        router.replace('/login' as any);
      }
    }
  }, [session, loading, segments]);

  return <>{children}</>;
}

// Handles auth deep links (password reset, email confirmation)
function DeepLinkHandler() {
  const { authEvent } = useAuth();

  // When Supabase fires PASSWORD_RECOVERY (user clicked reset link),
  // redirect to the reset-password screen
  useEffect(() => {
    if (authEvent === 'PASSWORD_RECOVERY') {
      router.replace('/reset-password' as any);
    }
  }, [authEvent]);

  // Process any incoming URL
  useEffect(() => {
    async function handleUrl(url: string) {
      // PKCE flow: ?code= in query params → exchange for session
      if (url.includes('?code=') || url.includes('&code=')) {
        await supabase.auth.exchangeCodeForSession(url);
        return;
      }
      // Implicit flow on mobile: #access_token= in hash → set session directly
      // (on web this is handled automatically by detectSessionInUrl: true)
      if (Platform.OS !== 'web' && url.includes('#access_token=')) {
        const hash = url.split('#')[1] ?? '';
        const params: Record<string, string> = {};
        for (const part of hash.split('&')) {
          // Use indexOf so token values that contain '=' (base64 padding) are
          // captured in full rather than silently truncated by split('=')[1].
          const eqIdx = part.indexOf('=');
          if (eqIdx < 1) continue;
          const k = part.slice(0, eqIdx);
          const v = decodeURIComponent(part.slice(eqIdx + 1));
          params[k] = v;
        }
        if (
          params.access_token &&
          params.refresh_token &&
          ACCEPTED_LINK_TYPES.has(params.type)
        ) {
          await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
        }
      }
    }

    // App opened from deep link while closed
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });

    // App already open and deep link arrives
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthGate>
          <AppProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <DeepLinkHandler />
              <Stack>
                {/* gestureEnabled: false prevents swipe-back to/from auth screens */}
                <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false, animation: 'none' }} />
                <Stack.Screen name="forgot-password" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="reset-password" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
                <Stack.Screen
                  name="paciente/[id]"
                  options={{
                    headerShown: false,
                    presentation: 'card',
                    animation: 'slide_from_right',
                  }}
                />
                <Stack.Screen name="+not-found" />
              </Stack>
              <StatusBar style="auto" />
            </ThemeProvider>
          </AppProvider>
        </AuthGate>
      </AuthProvider>
    </QueryClientProvider>
  );
}
