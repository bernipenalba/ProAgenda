import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authEvent: AuthChangeEvent | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateEmail: (newEmail: string, currentPassword: string) => Promise<{ error: string | null }>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<{ error: string | null }>;
  setNewPassword: (newPassword: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEvent, setAuthEvent] = useState<AuthChangeEvent | null>(null);

  useEffect(() => {
    // getUser() validates the JWT against Supabase servers (network round-trip).
    // getSession() alone only reads local storage and trusts whatever is cached.
    // If the server confirms the user is valid, we then hydrate the full session
    // object (which contains the access token needed by the rest of the app).
    supabase.auth.getUser().then(({ error }) => {
      if (error) {
        setSession(null);
        setLoading(false);
        return;
      }
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setAuthEvent(event);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // Generic message — never reveal whether the email exists in the system.
    if (error) return { error: 'Email o contraseña incorrectos.' };
    return { error: null };
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({ email, password });
    // Generic message — Supabase would otherwise return "User already registered"
    // when the email is taken, which enables account enumeration.
    if (error) return { error: 'No fue posible crear la cuenta. Verificá los datos e intentá de nuevo.' };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function resetPassword(email: string) {
    let redirectTo: string;
    if (Platform.OS === 'web') {
      // Web: use the actual browser origin so the link works on the same machine.
      redirectTo = typeof window !== 'undefined'
        ? `${window.location.origin}/reset-password`
        : Linking.createURL('/reset-password');
    } else {
      // In Expo Go, Constants.linkingUri is the actual URL the app connected with,
      // e.g. 'exp://192.168.x.x:8081' when started with --host lan.
      // We strip any existing /--/... suffix and append our path.
      // In a standalone build this is undefined → fall back to Linking.createURL
      // which returns 'proagenda://reset-password'.
      const linkingUri = (Constants as any).linkingUri as string | undefined;
      if (linkingUri?.startsWith('exp://')) {
        const base = linkingUri.split('/--/')[0].replace(/\/$/, '');
        redirectTo = `${base}/--/reset-password`;
      } else {
        redirectTo = Linking.createURL('/reset-password');
      }
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    // Never confirm whether the email address exists in the system.
    // Supabase already does not error for unknown emails, but normalize here
    // to ensure no implementation change in Supabase ever leaks this.
    if (error) return { error: 'Hubo un problema al procesar la solicitud. Intentá de nuevo.' };
    return { error: null };
  }

  async function updateEmail(newEmail: string, currentPassword: string) {
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: session?.user.email ?? '',
      password: currentPassword,
    });
    if (reAuthError) return { error: 'Contraseña incorrecta' };

    const emailRedirectTo = Linking.createURL('/auth-callback');
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo }
    );
    if (error) return { error: 'No fue posible actualizar el email. Verificá los datos e intentá nuevamente.' };
    return { error: null };
  }

  async function updatePassword(currentPassword: string, newPassword: string) {
    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: session?.user.email ?? '',
      password: currentPassword,
    });
    if (reAuthError) return { error: 'Contraseña actual incorrecta' };

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: 'No fue posible actualizar la contraseña. Verificá los datos e intentá nuevamente.' };
    return { error: null };
  }

  // Used from reset-password screen after the recovery link was clicked
  async function setNewPassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: 'No fue posible guardar la nueva contraseña. Intentá nuevamente.' };
    return { error: null };
  }

  return (
    <AuthContext.Provider value={{
      session, user: session?.user ?? null, loading, authEvent,
      signIn, signUp, signOut, resetPassword,
      updateEmail, updatePassword, setNewPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
