import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { resetPasswordSchema, zodFieldErrors } from '@/lib/schemas';

export default function ResetPasswordScreen() {
  const { setNewPassword, signOut, authEvent } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [success, setSuccess] = useState(false);

  // Guard: this screen is only valid when reached via a PASSWORD_RECOVERY link.
  // Any other authEvent (INITIAL_SESSION, SIGNED_IN, SIGNED_OUT) means the user
  // navigated here directly — redirect them to login.
  useEffect(() => {
    if (authEvent === null) return; // still initializing, wait
    if (authEvent !== 'PASSWORD_RECOVERY' && !success) {
      router.replace('/login' as any);
    }
  }, [authEvent, success]);

  function validate(): boolean {
    const result = resetPasswordSchema.safeParse({ password, confirm: confirmPassword });
    const e = zodFieldErrors(result);
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setGlobalError('');
    setLoading(true);
    const { error } = await setNewPassword(password);
    setLoading(false);

    if (error) {
      setGlobalError(error);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <KeyboardAvoidingView style={[s.container, { backgroundColor: c.background }]}>
        <View style={s.inner}>
          <View style={[s.successCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={[s.successIcon, { backgroundColor: c.successLight }]}>
              <MaterialIcons name="check-circle" size={32} color={c.success} />
            </View>
            <Text style={[s.successTitle, { color: c.text }]}>¡Contraseña actualizada!</Text>
            <Text style={[s.successBody, { color: c.muted }]}>
              Tu contraseña fue cambiada exitosamente. Iniciá sesión con tu nueva contraseña.
            </Text>
            <TouchableOpacity
              style={[s.button, { backgroundColor: c.accent }]}
              onPress={async () => { await signOut(); router.replace('/login' as any); }}
              activeOpacity={0.85}
            >
              <Text style={s.buttonText}>Ir al inicio de sesión</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>
        <View style={s.headerBlock}>
          <View style={[s.iconWrap, { backgroundColor: c.accentLight }]}>
            <MaterialIcons name="lock-reset" size={28} color={c.accent} />
          </View>
          <Text style={[s.title, { color: c.text }]}>Nueva contraseña</Text>
          <Text style={[s.subtitle, { color: c.muted }]}>
            Elegí una contraseña segura de al menos 12 caracteres.
          </Text>
        </View>

        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {/* Password */}
          <Text style={[s.label, { color: c.muted }]}>Nueva contraseña</Text>
          <View style={[s.inputRow, { borderColor: errors.password ? c.danger : c.border, backgroundColor: c.background }]}>
            <TextInput
              style={[s.input, { color: c.text }]}
              value={password}
              onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); }}
              secureTextEntry={!showPass}
              placeholder="••••••••"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPass(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name={showPass ? 'visibility-off' : 'visibility'} size={20} color={c.muted} />
            </TouchableOpacity>
          </View>
          {!!errors.password && (
            <View style={s.fieldErr}>
              <MaterialIcons name="error-outline" size={13} color={c.danger} />
              <Text style={[s.fieldErrText, { color: c.danger }]}>{errors.password}</Text>
            </View>
          )}

          {/* Confirm */}
          <Text style={[s.label, { color: c.muted, marginTop: 10 }]}>Confirmar contraseña</Text>
          <View style={[s.inputRow, { borderColor: errors.confirm ? c.danger : c.border, backgroundColor: c.background }]}>
            <TextInput
              style={[s.input, { color: c.text }]}
              value={confirmPassword}
              onChangeText={t => { setConfirmPassword(t); setErrors(e => ({ ...e, confirm: '' })); }}
              secureTextEntry={!showConfirm}
              placeholder="••••••••"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name={showConfirm ? 'visibility-off' : 'visibility'} size={20} color={c.muted} />
            </TouchableOpacity>
          </View>
          {!!errors.confirm && (
            <View style={s.fieldErr}>
              <MaterialIcons name="error-outline" size={13} color={c.danger} />
              <Text style={[s.fieldErrText, { color: c.danger }]}>{errors.confirm}</Text>
            </View>
          )}

          {!!globalError && (
            <View style={[s.globalError, { backgroundColor: c.dangerLight }]}>
              <MaterialIcons name="error-outline" size={15} color={c.danger} />
              <Text style={[s.globalErrorText, { color: c.danger }]}>{globalError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.button, { backgroundColor: c.accent }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.buttonText}>Guardar nueva contraseña</Text>
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
  headerBlock: { alignItems: 'center', marginBottom: 28 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  card: {
    borderRadius: 20, borderWidth: 1, padding: 22, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
  },
  input: { flex: 1, fontSize: 15 },
  fieldErr: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldErrText: { fontSize: 12, fontWeight: '500' },
  button: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  globalError: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, padding: 12,
  },
  globalErrorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  successCard: {
    borderRadius: 24, borderWidth: 1, padding: 28, alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  successIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  successBody: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
});
