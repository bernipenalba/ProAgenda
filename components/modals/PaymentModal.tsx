import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/context/AppContext';
import { PaymentMethod } from '@/constants/MockData';
import { parseLocalDate, getTodayISO } from '@/constants/dateUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  patientId: string | null;
}

function fmt(n: number) { return '$' + n.toLocaleString('es-AR'); }
function fmtDate(d: string) {
  return parseLocalDate(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function PaymentModal({ visible, onClose, patientId }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const { patients, markSessionsPaid } = useApp();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [method, setMethod] = useState<PaymentMethod>('transferencia');

  // Always read live patient data from context so the session list reflects
  // any state changes that happen while the modal is open.
  const patient = patientId ? (patients.find(p => p.id === patientId) ?? null) : null;

  // Reset selection and method every time the modal opens.
  useEffect(() => {
    if (visible) {
      setSelected(new Set());
      setMethod('transferencia');
    }
  }, [visible]);

  if (!patient) return null;

  const todayStr = getTodayISO();
  // Sessions eligible for payment: non-cancelled, unpaid, date <= today.
  const unpaid = patient.sessions
    .filter(s => s.status !== 'cancelada' && !s.paid && s.date <= todayStr)
    .sort((a, b) => b.date.localeCompare(a.date));

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(unpaid.map(s => s.id)));
  }

  function handleMarkPaid() {
    // Only pay sessions that are still in the unpaid list (guards against
    // stale selection if the list changed while the modal was open).
    const validIds = [...selected].filter(sid => unpaid.some(s => s.id === sid));
    if (validIds.length === 0) return;
    markSessionsPaid(patient!.id, validIds, method);
    onClose();
  }

  const totalSelected = unpaid
    .filter(s => selected.has(s.id))
    .reduce((sum, s) => sum + s.amount, 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[s.sheet, { backgroundColor: c.card }]}>
        <View style={[s.handle, { backgroundColor: c.border }]} />

        <View style={s.titleRow}>
          <View>
            <Text style={[s.title, { color: c.text }]}>Registrar cobro</Text>
            <Text style={[s.sub, { color: c.muted }]}>{patient.name}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: c.mutedLight }]}>
            <Text style={[s.closeX, { color: c.muted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {unpaid.length === 0 ? (
          <View style={[s.allGoodBox, { backgroundColor: c.successLight }]}>
            <Text style={[s.allGoodText, { color: c.success }]}>
              Todo al día — no hay sesiones pendientes de cobro
            </Text>
          </View>
        ) : (
          <>
            <View style={s.hintRow}>
              <Text style={[s.hint, { color: c.muted }]}>Seleccioná las sesiones a cobrar:</Text>
              {selected.size < unpaid.length ? (
                <TouchableOpacity onPress={selectAll}>
                  <Text style={[s.selectAll, { color: c.accent }]}>Seleccionar todo</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={() => setSelected(new Set())}>
                  <Text style={[s.selectAll, { color: c.muted }]}>Deseleccionar</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
              {unpaid.map(session => {
                const isSel = selected.has(session.id);
                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      s.row,
                      {
                        borderColor: isSel ? c.accent : c.border,
                        backgroundColor: isSel ? c.accentLight : c.background,
                      },
                    ]}
                    onPress={() => toggle(session.id)}
                    activeOpacity={0.75}>
                    <View style={[
                      s.checkbox,
                      {
                        borderColor: isSel ? c.accent : c.border + '99',
                        backgroundColor: isSel ? c.accent : 'transparent',
                      },
                    ]}>
                      {isSel && <Text style={s.checkmark}>✓</Text>}
                    </View>
                    <View style={s.sessionInfo}>
                      <Text style={[s.sessionDate, { color: c.text }]}>{fmtDate(session.date)}</Text>
                      <Text style={[s.sessionSub, { color: c.muted }]}>
                        {session.date < todayStr ? 'Sesión vencida' : 'Sesión de hoy'}
                      </Text>
                    </View>
                    <Text style={[s.sessionAmt, { color: c.text }]}>{fmt(session.amount)}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selected.size > 0 && (
              <View style={[s.summary, { borderTopColor: c.border }]}>
                <Text style={[s.summaryLabel, { color: c.muted }]}>
                  {selected.size} sesión{selected.size !== 1 ? 'es' : ''}
                </Text>
                <Text style={[s.summaryTotal, { color: c.text }]}>{fmt(totalSelected)}</Text>
              </View>
            )}

            <View style={s.methodWrap}>
              <Text style={[s.methodLabel, { color: c.muted }]}>MÉTODO DE PAGO</Text>
              <View style={[s.methodToggle, { backgroundColor: c.mutedLight }]}>
                {(['transferencia', 'efectivo'] as PaymentMethod[]).map(m => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => setMethod(m)}
                    style={[
                      s.methodBtn,
                      method === m && {
                        backgroundColor: c.card,
                        shadowColor: '#000', shadowOpacity: 0.06,
                        shadowRadius: 3, elevation: 1,
                      },
                    ]}>
                    <Text style={[s.methodBtnText, { color: method === m ? c.text : c.muted }]}>
                      {m === 'transferencia' ? 'Transferencia' : 'Efectivo'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                s.submitBtn,
                { backgroundColor: selected.size > 0 ? c.success : c.mutedLight },
              ]}
              onPress={handleMarkPaid}
              activeOpacity={0.85}
              disabled={selected.size === 0}>
              <Text style={[s.submitText, { color: selected.size > 0 ? '#fff' : c.muted }]}>
                {selected.size > 0
                  ? `Cobrar ${fmt(totalSelected)}`
                  : 'Seleccioná sesiones'}
              </Text>
            </TouchableOpacity>
          </>
        )}
        <View style={{ height: 8 }} />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000044' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '82%',
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 22,
    shadowOffset: { width: 0, height: -4 }, elevation: 12,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  title: { fontSize: 21, fontWeight: '800' },
  sub: { fontSize: 13, marginTop: 3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 14, fontWeight: '700' },
  hintRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  hint: { fontSize: 13 },
  selectAll: { fontSize: 13, fontWeight: '700' },
  list: { maxHeight: 280 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 13, borderWidth: 1.5, padding: 14, marginBottom: 10,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 7, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '900' },
  sessionInfo: { flex: 1 },
  sessionDate: { fontSize: 14, fontWeight: '700' },
  sessionSub: { fontSize: 12, marginTop: 2 },
  sessionAmt: { fontSize: 15, fontWeight: '800' },
  summary: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingTop: 14, marginTop: 4, borderTopWidth: 1, marginBottom: 14,
  },
  summaryLabel: { fontSize: 13 },
  summaryTotal: { fontSize: 17, fontWeight: '800' },
  allGoodBox: { borderRadius: 13, padding: 18, marginBottom: 20 },
  allGoodText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  methodWrap: { marginBottom: 14 },
  methodLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  methodToggle: { flexDirection: 'row', borderRadius: 11, padding: 3 },
  methodBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  methodBtnText: { fontSize: 14, fontWeight: '700' },
  submitBtn: {
    paddingVertical: 16, borderRadius: 15, alignItems: 'center',
    shadowColor: '#8E9E6A', shadowOpacity: 0.2, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  submitText: { fontSize: 16, fontWeight: '700' },
});
