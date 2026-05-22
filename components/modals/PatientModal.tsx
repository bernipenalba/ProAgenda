import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp, NewPatientInput } from '@/context/AppContext';
import { Patient } from '@/constants/MockData';

interface Props {
  visible: boolean;
  onClose: () => void;
  patient?: Patient;
}

export function PatientModal({ visible, onClose, patient }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const { addPatient, updatePatient } = useApp();
  const isEdit = !!patient;

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [observations, setObservations] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) {
      if (patient) {
        setName(patient.name);
        setAge(String(patient.age));
        setPhone(patient.phone);
        setEmail(patient.email);
        setObservations(patient.observations);
      } else {
        setName(''); setAge(''); setPhone(''); setEmail(''); setObservations('');
      }
      setError('');
    }
  }, [visible, patient]);

  function handleSubmit() {
    if (!name.trim()) { setError('El nombre es obligatorio'); return; }
    if (isEdit && patient) {
      updatePatient(patient.id, { name, age: parseInt(age) || 0, phone, email, observations });
    } else {
      addPatient({ name, age, phone, email, observations } as NewPatientInput);
    }
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.kav}>
        <View style={[s.sheet, { backgroundColor: c.card }]}>
          <View style={[s.handle, { backgroundColor: c.border }]} />

          <View style={s.titleRow}>
            <Text style={[s.title, { color: c.text }]}>
              {isEdit ? 'Editar paciente' : 'Nuevo paciente'}
            </Text>
            <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: c.mutedLight }]}>
              <Text style={[s.closeX, { color: c.muted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {!!error && (
              <View style={[s.errorBox, { backgroundColor: c.dangerLight }]}>
                <Text style={[s.errorText, { color: c.danger }]}>{error}</Text>
              </View>
            )}

            <Field label="Nombre *" value={name} onChange={setName}
              placeholder="Ej: Ana González" c={c} />
            <Field label="Edad" value={age} onChange={setAge}
              placeholder="35" keyboardType="numeric" c={c} />
            <Field label="Teléfono" value={phone} onChange={setPhone}
              placeholder="+54 9 11 ..." c={c} />
            <Field label="Email" value={email} onChange={setEmail}
              placeholder="correo@ejemplo.com" keyboardType="email-address" c={c} />
            <Field label="Observaciones" value={observations} onChange={setObservations}
              placeholder="Motivo de consulta, contexto..." multiline c={c} />

            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: c.accent }]}
              onPress={handleSubmit} activeOpacity={0.85}>
              <Text style={s.submitText}>{isEdit ? 'Guardar cambios' : 'Crear paciente'}</Text>
            </TouchableOpacity>
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType, multiline, c,
}: {
  label: string; value: string; onChange: (t: string) => void;
  placeholder: string; keyboardType?: any; multiline?: boolean;
  c: typeof Colors['light'];
}) {
  return (
    <View style={f.wrap}>
      <Text style={[f.label, { color: c.muted }]}>{label}</Text>
      <TextInput
        style={[
          f.input,
          { color: c.text, borderColor: c.border, backgroundColor: c.background },
          multiline && f.multiline,
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted + '66'}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000044' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 22,
  },
  title: { fontSize: 21, fontWeight: '800' },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  closeX: { fontSize: 14, fontWeight: '700' },
  errorBox: { borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '600' },
  submitBtn: {
    paddingVertical: 16, borderRadius: 15, alignItems: 'center', marginTop: 6,
    shadowColor: '#BB8588', shadowOpacity: 0.22, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

const f = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, marginBottom: 7, textTransform: 'uppercase' },
  input: {
    borderWidth: 1.5, borderRadius: 13,
    paddingHorizontal: 15, paddingVertical: 13, fontSize: 15,
  },
  multiline: { minHeight: 90, paddingTop: 13 },
});
