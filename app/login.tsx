import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { loginSchema, signupSchema, zodFieldErrors } from '@/lib/schemas';

// ── field component ───────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, keyboardType, secureTextEntry,
  showToggle, onToggleSecure, error, colors: c,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  keyboardType?: 'email-address' | 'default';
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggleSecure?: () => void;
  error?: string;
  colors: typeof Colors.light;
}) {
  const hasError = !!error;
  return (
    <View style={fieldS.container}>
      <Text style={[fieldS.label, { color: c.muted }]}>{label}</Text>
      <View style={[
        fieldS.row,
        { borderColor: hasError ? c.danger : c.border, backgroundColor: c.background },
      ]}>
        <TextInput
          style={[fieldS.input, { color: c.text }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={c.muted}
          keyboardType={keyboardType ?? 'default'}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {showToggle && onToggleSecure && (
          <TouchableOpacity onPress={onToggleSecure} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons
              name={secureTextEntry ? 'visibility' : 'visibility-off'}
              size={20}
              color={c.muted}
            />
          </TouchableOpacity>
        )}
      </View>
      {hasError && (
        <View style={fieldS.errorRow}>
          <MaterialIcons name="error-outline" size={13} color={c.danger} />
          <Text style={[fieldS.errorText, { color: c.danger }]}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const fieldS = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  errorText: { fontSize: 12, fontWeight: '500' },
});

// ── main screen ───────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // fields
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // show/hide toggles
  const [showPass, setShowPass] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);

  // inline errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  function clearErrors() {
    setErrors({});
    setGlobalError('');
  }

  function switchMode() {
    setMode(m => m === 'login' ? 'signup' : 'login');
    setEmail(''); setEmailConfirm(''); setPassword(''); setPasswordConfirm('');
    clearErrors();
    setCooldown(0);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
  }

  function startCooldown(seconds: number) {
    setCooldown(seconds);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function validate(): boolean {
    const result = mode === 'login'
      ? loginSchema.safeParse({ email: email.trim(), password })
      : signupSchema.safeParse({
          email: email.trim(),
          emailConfirm: emailConfirm.trim(),
          password,
          passwordConfirm,
        });

    const e = zodFieldErrors(result);
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (cooldown > 0) return;
    clearErrors();
    if (!validate()) return;

    setLoading(true);
    const { error } = mode === 'login'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password);
    setLoading(false);

    if (error) {
      setGlobalError(error);
      if (mode === 'login') startCooldown(5);
      return;
    }

    router.replace('/(tabs)' as any);
  }

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.headerBlock}>
          <Text style={[s.title, { color: c.text }]}>ProAgenda</Text>
          <Text style={[s.subtitle, { color: c.muted }]}>
            {mode === 'login' ? 'Iniciá sesión para continuar' : 'Creá tu cuenta'}
          </Text>
        </View>

        {/* Form card */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>

          <Field
            label="Email"
            value={email}
            onChange={v => { setEmail(v); clearErrors(); }}
            placeholder="usuario@gmail.com"
            keyboardType="email-address"
            error={errors.email}
            colors={c}
          />

          {mode === 'signup' && (
            <Field
              label="Confirmar email"
              value={emailConfirm}
              onChange={v => { setEmailConfirm(v); clearErrors(); }}
              placeholder="usuario@gmail.com"
              keyboardType="email-address"
              error={errors.emailConfirm}
              colors={c}
            />
          )}

          <Field
            label="Contraseña"
            value={password}
            onChange={v => { setPassword(v); clearErrors(); }}
            placeholder="••••••••"
            secureTextEntry={!showPass}
            showToggle
            onToggleSecure={() => setShowPass(v => !v)}
            error={errors.password}
            colors={c}
          />

          {mode === 'signup' && (
            <Field
              label="Confirmar contraseña"
              value={passwordConfirm}
              onChange={v => { setPasswordConfirm(v); clearErrors(); }}
              placeholder="••••••••"
              secureTextEntry={!showPassConfirm}
              showToggle
              onToggleSecure={() => setShowPassConfirm(v => !v)}
              error={errors.passwordConfirm}
              colors={c}
            />
          )}

          {!!globalError && (
            <View style={[s.globalError, { backgroundColor: c.dangerLight }]}>
              <MaterialIcons name="error-outline" size={15} color={c.danger} />
              <Text style={[s.globalErrorText, { color: c.danger }]}>{globalError}</Text>
            </View>
          )}

          {mode === 'login' && (
            <TouchableOpacity
              onPress={() => router.push('/forgot-password' as any)}
              activeOpacity={0.7}
              style={s.forgotRow}
            >
              <Text style={[s.forgotText, { color: c.accent }]}>¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[s.button, { backgroundColor: cooldown > 0 ? c.muted : c.accent }]}
            onPress={handleSubmit}
            disabled={loading || cooldown > 0}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.buttonText}>
                  {cooldown > 0
                    ? `Esperar ${cooldown}s...`
                    : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
                </Text>
            }
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={switchMode} activeOpacity={0.7}>
          <Text style={[s.toggle, { color: c.accent }]}>
            {mode === 'login'
              ? '¿No tenés cuenta? Registrate'
              : '¿Ya tenés cuenta? Iniciá sesión'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 0 },
  headerBlock: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 },
  subtitle: { fontSize: 15 },
  card: {
    borderRadius: 20, borderWidth: 1, padding: 22, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  globalError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 12,
  },
  globalErrorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  button: {
    borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggle: { textAlign: 'center', marginTop: 20, fontSize: 14, fontWeight: '500' },
  forgotRow: { alignItems: 'flex-end', marginTop: -2 },
  forgotText: { fontSize: 13, fontWeight: '600' },
});
