import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, Animated,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { updateEmailSchema, updatePasswordSchema, zodFieldErrors } from '@/lib/schemas';

// ── account action modal ──────────────────────────────────────────────────────

type AccountModalProps = {
  visible: boolean;
  mode: 'email' | 'password';
  onClose: () => void;
  colors: typeof Colors.light;
};

function AccountModal({ visible, mode, onClose, colors: c }: AccountModalProps) {
  const { updateEmail, updatePassword, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newValue, setNewValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setCurrentPassword(''); setNewValue(''); setConfirmValue('');
      setError(''); setShowCurrent(false); setShowNew(false); setShowConfirm(false);
    }
  }, [visible]);

  async function handleSubmit() {
    if (loading) return;
    setError('');

    if (mode === 'email') {
      const result = updateEmailSchema.safeParse({
        currentPassword: currentPassword.trim(),
        newEmail: newValue.trim(),
      });
      if (!result.success) {
        const errs = zodFieldErrors(result);
        setError(errs.currentPassword ?? errs.newEmail ?? 'Verificá los datos e intentá de nuevo.');
        return;
      }
      if (newValue.trim() === user?.email) {
        setError('El nuevo email es igual al actual');
        return;
      }
    } else {
      const result = updatePasswordSchema.safeParse({
        currentPassword: currentPassword.trim(),
        newPassword: newValue,
        confirmValue,
      });
      if (!result.success) {
        const errs = zodFieldErrors(result);
        setError(errs.currentPassword ?? errs.newPassword ?? errs.confirmValue ?? 'Verificá los datos e intentá de nuevo.');
        return;
      }
    }

    setLoading(true);
    const { error: err } = mode === 'email'
      ? await updateEmail(newValue.trim(), currentPassword)
      : await updatePassword(currentPassword, newValue);
    setLoading(false);

    if (err) { setError(err); return; }

    Alert.alert(
      '¡Listo!',
      mode === 'email'
        ? 'Se envió un email de confirmación a la nueva dirección.'
        : 'Contraseña actualizada correctamente.',
      [{ text: 'OK', onPress: onClose }]
    );
  }

  const title = mode === 'email' ? 'Editar email' : 'Cambiar contraseña';

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[styles.modalCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: c.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color={c.muted} />
            </TouchableOpacity>
          </View>

          {mode === 'email' && (
            <Text style={[styles.modalSub, { color: c.muted }]}>Email actual: {user?.email}</Text>
          )}

          <Text style={[styles.fieldLabel, { color: c.muted }]}>Contraseña actual</Text>
          <View style={[styles.inputRow, { borderColor: error && !currentPassword ? c.danger : c.border, backgroundColor: c.background }]}>
            <TextInput
              style={[styles.inputField, { color: c.text }]}
              value={currentPassword}
              onChangeText={t => { setCurrentPassword(t); setError(''); }}
              secureTextEntry={!showCurrent}
              placeholder="••••••••"
              placeholderTextColor={c.muted}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowCurrent(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name={showCurrent ? 'visibility-off' : 'visibility'} size={20} color={c.muted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.fieldLabel, { color: c.muted }]}>
            {mode === 'email' ? 'Nuevo email' : 'Nueva contraseña'}
          </Text>
          <View style={[styles.inputRow, { borderColor: c.border, backgroundColor: c.background }]}>
            <TextInput
              style={[styles.inputField, { color: c.text }]}
              value={newValue}
              onChangeText={t => { setNewValue(t); setError(''); }}
              secureTextEntry={mode === 'password' && !showNew}
              keyboardType={mode === 'email' ? 'email-address' : 'default'}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={mode === 'email' ? 'nuevo@email.com' : '••••••••'}
              placeholderTextColor={c.muted}
            />
            {mode === 'password' && (
              <TouchableOpacity onPress={() => setShowNew(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialIcons name={showNew ? 'visibility-off' : 'visibility'} size={20} color={c.muted} />
              </TouchableOpacity>
            )}
          </View>

          {mode === 'password' && (
            <>
              <Text style={[styles.fieldLabel, { color: c.muted }]}>Confirmar nueva contraseña</Text>
              <View style={[styles.inputRow, { borderColor: c.border, backgroundColor: c.background }]}>
                <TextInput
                  style={[styles.inputField, { color: c.text }]}
                  value={confirmValue}
                  onChangeText={t => { setConfirmValue(t); setError(''); }}
                  secureTextEntry={!showConfirm}
                  placeholder="••••••••"
                  placeholderTextColor={c.muted}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name={showConfirm ? 'visibility-off' : 'visibility'} size={20} color={c.muted} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: c.dangerLight }]}>
              <MaterialIcons name="error-outline" size={14} color={c.danger} />
              <Text style={[styles.errorText, { color: c.danger }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: c.accent }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.submitText}>Guardar cambios</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── user menu ─────────────────────────────────────────────────────────────────

export function UserMenu() {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();

  const [menuVisible, setMenuVisible] = useState(false);
  const [accountModal, setAccountModal] = useState<'email' | 'password' | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-8)).current;

  function openMenu() {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start();
  }

  function closeMenu(cb?: () => void) {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -8, duration: 130, useNativeDriver: true }),
    ]).start(() => {
      setMenuVisible(false);
      cb?.();
    });
  }

  function handleSignOut() {
    closeMenu(() => {
      Alert.alert('Cerrar sesión', '¿Seguro que querés salir?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: signOut },
      ]);
    });
  }

  const menuTop = insets.top + 56;

  return (
    <>
      {/* Trigger button */}
      <TouchableOpacity
        style={[styles.avatarBtn, { backgroundColor: c.accentLight }]}
        onPress={openMenu}
        activeOpacity={0.75}
      >
        <MaterialIcons name="person" size={22} color={c.accent} />
      </TouchableOpacity>

      {/* Dropdown menu via Modal for proper z-index */}
      <Modal visible={menuVisible} transparent animationType="none">
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => closeMenu()} activeOpacity={1} />
        <Animated.View style={[
          styles.dropdown,
          { backgroundColor: c.card, borderColor: c.border, top: menuTop },
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}>
          {/* User email display */}
          <View style={[styles.dropdownHeader, { borderBottomColor: c.border }]}>
            <MaterialIcons name="account-circle" size={32} color={c.accent} />
            <Text style={[styles.dropdownEmail, { color: c.text }]} numberOfLines={1}>
              {user?.email ?? ''}
            </Text>
          </View>

          {/* Menu options */}
          <MenuOption
            icon="edit"
            label="Editar email"
            color={c.text}
            iconColor={c.accent}
            onPress={() => closeMenu(() => setAccountModal('email'))}
          />
          <MenuOption
            icon="lock-outline"
            label="Cambiar contraseña"
            color={c.text}
            iconColor={c.accent}
            onPress={() => closeMenu(() => setAccountModal('password'))}
          />
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <MenuOption
            icon="logout"
            label="Cerrar sesión"
            color={c.danger}
            iconColor={c.danger}
            onPress={handleSignOut}
          />
        </Animated.View>
      </Modal>

      {/* Account modals */}
      <AccountModal
        visible={accountModal === 'email'}
        mode="email"
        onClose={() => setAccountModal(null)}
        colors={c}
      />
      <AccountModal
        visible={accountModal === 'password'}
        mode="password"
        onClose={() => setAccountModal(null)}
        colors={c}
      />
    </>
  );
}

function MenuOption({ icon, label, color, iconColor, onPress }: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
  iconColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.option} onPress={onPress} activeOpacity={0.65}>
      <MaterialIcons name={icon} size={18} color={iconColor} />
      <Text style={[styles.optionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  avatarBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute', right: 20, width: 250,
    borderRadius: 16, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 }, elevation: 10,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 16, borderBottomWidth: 1,
  },
  dropdownEmail: { fontSize: 13, fontWeight: '600', flex: 1 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 13, paddingHorizontal: 16,
  },
  optionLabel: { fontSize: 14, fontWeight: '600' },
  divider: { height: 1, marginHorizontal: 16 },
  // account modal
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#00000040', padding: 24,
  },
  modalCard: {
    width: '100%', borderRadius: 20, borderWidth: 1, padding: 24, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 }, elevation: 12,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSub: { fontSize: 13, marginBottom: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 4, letterSpacing: 0.2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
  },
  inputField: { flex: 1, fontSize: 15 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, padding: 10, marginTop: 8,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  submitBtn: {
    borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 16,
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
