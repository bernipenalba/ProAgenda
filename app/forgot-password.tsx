import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { forgotPasswordSchema, zodFieldErrors } from '@/lib/schemas';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

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

  async function handleSubmit() {
    if (loading || cooldown > 0) return;
    setEmailError('');
    setGlobalError('');

    const result = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!result.success) {
      const errs = zodFieldErrors(result);
      if (errs.email) setEmailError(errs.email);
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email.trim());
    setLoading(false);

    if (error) {
      setGlobalError(error);
      startCooldown(30);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <KeyboardAvoidingView style={[s.container, { backgroundColor: c.background }]}>
        <View style={s.inner}>
          <View style={[s.successCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[s.successIcon, { backgroundColor: c.successLight }]}>
              <MaterialIcons name="mark-email-read" size={32} color={c.success} />
            </View>
            <Text style={[s.successTitle, { color: c.text }]}>Revisá tu email</Text>
            <Text style={[s.successBody, { color: c.muted }]}>
              Enviamos un link a{' '}
              <Text style={{ fontWeight: '700', color: c.text }}>{email.trim()}</Text>
              {' '}para restablecer tu contraseña.
            </Text>
            <Text style={[s.successHint, { color: c.muted }]}>
              Hacé click en el link del email para continuar. Si no lo encontrás, revisá la carpeta de spam.
            </Text>
            <TouchableOpacity
              style={[s.backBtn, { backgroundColor: c.accent }]}
              onPress={() => router.replace('/login' as any)}
              activeOpacity={0.85}
            >
              <Text style={s.backBtnText}>Volver al inicio</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  const isBlocked = loading || cooldown > 0;

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>
        {/* Back */}
        <TouchableOpacity style={s.backRow} onPress={() => router.back()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={22} color={c.accent} />
          <Text style={[s.backText, { color: c.accent }]}>Volver</Text>
        </TouchableOpacity>

        <View style={s.headerBlock}>
          <Text style={[s.title, { color: c.text }]}>Olvidé mi contraseña</Text>
          <Text style={[s.subtitle, { color: c.muted }]}>
            Ingresá tu email y te enviamos un link para restablecerla.
          </Text>
        </View>

        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.label, { color: c.muted }]}>Email</Text>
          <View style={[
            s.inputRow,
            { borderColor: emailError ? c.danger : c.border, backgroundColor: c.background },
          ]}>
            <TextInput
              style={[s.input, { color: c.text }]}
              value={email}
              onChangeText={t => { setEmail(t); setEmailError(''); setGlobalError(''); }}
              placeholder="usuario@gmail.com"
              placeholderTextColor={c.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isBlocked}
            />
          </View>
          {!!emailError && (
            <View style={s.fieldErrorRow}>
              <MaterialIcons name="error-outline" size={13} color={c.danger} />
              <Text style={[s.fieldErrorText, { color: c.danger }]}>{emailError}</Text>
            </View>
          )}

          {!!globalError && (
            <View style={[s.globalError, { backgroundColor: c.dangerLight }]}>
              <MaterialIcons name="error-outline" size={15} color={c.danger} />
              <Text style={[s.globalErrorText, { color: c.danger }]}>{globalError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.button, { backgroundColor: isBlocked ? c.muted : c.accent }]}
            onPress={handleSubmit}
            disabled={isBlocked}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.buttonText}>
                  {cooldown > 0 ? `Esperar ${cooldown}s...` : 'Enviar link de recuperación'}
                </Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: 'center', padding: 24 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 32 },
  backText: { fontSize: 15, fontWeight: '600' },
  headerBlock: { marginBottom: 28 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, lineHeight: 22 },
  card: {
    borderRadius: 20, borderWidth: 1, padding: 22, gap: 8,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15 },
  fieldErrorRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldErrorText: { fontSize: 12, fontWeight: '500' },
  globalError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 12,
  },
  globalErrorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  button: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  // success state
  successCard: {
    borderRadius: 24, borderWidth: 1, padding: 28, alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  successIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  successBody: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  successHint: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  backBtn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', marginTop: 4 },
  backBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
