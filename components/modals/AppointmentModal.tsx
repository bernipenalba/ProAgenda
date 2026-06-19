import React, { useState, useEffect, useMemo } from 'react';
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
import { useApp, NewAppointmentInput } from '@/context/AppContext';
import { Appointment, AppointmentModality } from '@/constants/MockData';
import { DatePicker } from '@/components/ui/DatePicker';
import { TimePicker } from '@/components/ui/TimePicker';
import { getTodayISO } from '@/constants/dateUtils';
import { appointmentSchema } from '@/lib/schemas';
import {
  getBlockedStartSlots,
  findConflict,
  buildAppointmentInterval,
  formatTimeHHMM,
} from '@/lib/appointmentConflicts';

interface Props {
  visible: boolean;
  onClose: () => void;
  appointment?: Appointment;
  defaultPatientId?: string;
  defaultDate?: string;
}

export function AppointmentModal({ visible, onClose, appointment, defaultPatientId, defaultDate }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const { patients, appointments, addAppointment, updateAppointment } = useApp();
  const isEdit = !!appointment;

  const activePatients = patients;

  const [patientId, setPatientId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('50');
  const [modality, setModality] = useState<AppointmentModality>('presencial');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // All HH:MM slots that would conflict with an appointment of `duration` minutes on `date`.
  // Considers full intervals (not just exact start times) and the 21:00 cutoff.
  const blockedSlots = useMemo(() => {
    const dur = parseInt(duration, 10);
    return getBlockedStartSlots(appointments, date, isNaN(dur) ? 50 : dur, appointment?.id);
  }, [appointments, date, duration, appointment?.id]);

  const selectedPatient = patients.find(p => p.id === patientId);

  useEffect(() => {
    if (visible) {
      if (appointment) {
        setPatientId(appointment.patientId);
        setDate(appointment.date);
        setTime(appointment.time);
        setDuration(String(appointment.duration));
        setModality(appointment.modality);
        setAmount(String(appointment.amount));
      } else {
        setPatientId(defaultPatientId ?? '');
        setDate(defaultDate ?? getTodayISO());
        setTime('');
        setDuration('50');
        setModality('presencial');
        setAmount('');
      }
      setError('');
      setSubmitting(false);
      setShowDropdown(false);
    }
  }, [visible, appointment, defaultPatientId, defaultDate]);

  const canSubmit = !!patientId && !!time && !!amount && !isNaN(parseInt(amount));

  function handleSubmit() {
    if (submitting) return;

    const result = appointmentSchema.safeParse({ patientId, date, time, duration, modality, amount });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Verificá los campos e intentá de nuevo.');
      return;
    }

    const dur = parseInt(duration, 10);

    // Interval-based overlap check (excludes self when editing).
    const conflict = findConflict(appointments, date, time, dur, appointment?.id);
    if (conflict) {
      const existingDuration = conflict.duration ?? 60;
      const { start, end } = buildAppointmentInterval(conflict.date, conflict.time, existingDuration);
      setError(
        `Ya existe un turno de ${formatTimeHHMM(start)} a ${formatTimeHHMM(end)}. Elegí otro horario o ajustá la duración.`,
      );
      return;
    }

    // 21:00 cutoff check.
    const [year, month, day] = date.split('-').map(Number);
    const { end: newEnd } = buildAppointmentInterval(date, time, dur);
    const cutoff = new Date(year, month - 1, day, 21, 0, 0);
    if (newEnd > cutoff) {
      setError('El turno no puede finalizar después de las 21:00.');
      return;
    }

    setSubmitting(true);
    if (isEdit && appointment) {
      updateAppointment(appointment.id, {
        date, time,
        duration: parseInt(duration) || 50,
        modality,
        amount: parseInt(amount),
      });
    } else {
      addAppointment({ patientId, date, time, duration, modality, amount } as NewAppointmentInput);
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
              {isEdit ? 'Editar turno' : 'Nuevo turno'}
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

            {/* Patient picker */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, { color: c.muted }]}>PACIENTE *</Text>
              <TouchableOpacity
                style={[s.picker, { borderColor: c.border, backgroundColor: c.background }]}
                onPress={() => setShowDropdown(v => !v)}>
                {selectedPatient ? (
                  <View style={s.pickerSelected}>
                    <View style={[s.pickerAvatar, { backgroundColor: selectedPatient.avatarColor + '25' }]}>
                      <Text style={{ color: selectedPatient.avatarColor, fontSize: 11, fontWeight: '800' }}>
                        {selectedPatient.initials}
                      </Text>
                    </View>
                    <Text style={{ color: c.text, fontSize: 15, fontWeight: '600' }}>
                      {selectedPatient.name}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: c.muted + '88', fontSize: 15 }}>Seleccionar paciente...</Text>
                )}
                <Text style={{ color: c.muted, fontSize: 14 }}>{showDropdown ? '▴' : '▾'}</Text>
              </TouchableOpacity>
              {showDropdown && (
                <View style={[s.dropdown, { backgroundColor: c.card, borderColor: c.border }]}>
                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {activePatients.map((p, idx) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          s.dropItem,
                          {
                            borderBottomColor: c.border,
                            borderBottomWidth: idx < activePatients.length - 1 ? 1 : 0,
                            backgroundColor: patientId === p.id ? c.accentLight : 'transparent',
                          },
                        ]}
                        onPress={() => { setPatientId(p.id); setShowDropdown(false); }}>
                        <View style={[s.dropAvatar, { backgroundColor: p.avatarColor + '25' }]}>
                          <Text style={{ color: p.avatarColor, fontSize: 11, fontWeight: '800' }}>
                            {p.initials}
                          </Text>
                        </View>
                        <Text style={[s.dropName, { color: patientId === p.id ? c.accent : c.text }]}>
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Date */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, { color: c.muted }]}>FECHA *</Text>
              <DatePicker value={date} onChange={setDate} c={c} />
            </View>

            {/* Duration */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, { color: c.muted }]}>DURACIÓN (min)</Text>
              <TextInput
                style={[s.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder="50"
                placeholderTextColor={c.muted + '66'}
              />
            </View>

            {/* Time */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, { color: c.muted }]}>
                HORARIO *{!time && <Text style={{ color: c.danger }}> — seleccioná uno</Text>}
              </Text>
              <TimePicker value={time} onChange={setTime} c={c} bookedTimes={blockedSlots} />
            </View>

            {/* Amount */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, { color: c.muted }]}>HONORARIO *</Text>
              <TextInput
                style={[s.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder="8000"
                placeholderTextColor={c.muted + '66'}
              />
            </View>

            {/* Modality toggle */}
            <View style={s.fieldWrap}>
              <Text style={[s.label, { color: c.muted }]}>MODALIDAD</Text>
              <View style={[s.toggle, { backgroundColor: c.mutedLight }]}>
                {(['presencial', 'virtual'] as AppointmentModality[]).map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setModality(m)}
                    style={[
                      s.toggleBtn,
                      modality === m && {
                        backgroundColor: c.card,
                        shadowColor: '#000', shadowOpacity: 0.06,
                        shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2,
                      },
                    ]}>
                    <Text style={[s.toggleText, { color: modality === m ? c.text : c.muted }]}>
                      {m === 'presencial' ? 'Presencial' : 'Virtual'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: canSubmit && !submitting ? c.accent : c.mutedLight }]}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={!canSubmit || submitting}>
              <Text style={[s.submitText, { color: canSubmit && !submitting ? '#fff' : c.muted }]}>
                {isEdit ? 'Guardar cambios' : 'Crear turno'}
              </Text>
            </TouchableOpacity>
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000044' },
  kav: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '92%',
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 22,
    shadowOffset: { width: 0, height: -4 }, elevation: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 22,
  },
  title: { fontSize: 21, fontWeight: '800' },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 14, fontWeight: '700' },
  errorBox: { borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '600' },
  fieldWrap: { marginBottom: 18 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 7 },
  input: {
    borderWidth: 1.5, borderRadius: 13,
    paddingHorizontal: 15, paddingVertical: 13, fontSize: 15,
  },
  picker: {
    borderWidth: 1.5, borderRadius: 13,
    paddingHorizontal: 15, paddingVertical: 13,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  pickerSelected: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  pickerAvatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  dropdown: {
    borderWidth: 1, borderRadius: 13, marginTop: 4,
    overflow: 'hidden',
  },
  dropItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 15, paddingVertical: 11,
  },
  dropAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dropName: { fontSize: 14, fontWeight: '600' },
  toggle: { flexDirection: 'row', borderRadius: 11, padding: 3 },
  toggleBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  toggleText: { fontSize: 14, fontWeight: '700' },
  submitBtn: {
    paddingVertical: 16, borderRadius: 15, alignItems: 'center', marginTop: 4,
    shadowColor: '#BB8588', shadowOpacity: 0.22, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
