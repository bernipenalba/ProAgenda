import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Appointment, PaymentMethod } from '@/constants/MockData';
import { parseLocalDate } from '@/constants/dateUtils';

// ── helpers ───────────────────────────────────────────────────────────────────

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatDisplayDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('es-AR');
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  appt: Appointment;
  colors: typeof Colors['light'];
  onClose: () => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onMarkPaid: (method: PaymentMethod) => void;
  onUnmarkPaid: () => void;
}

export function ApptDetailModal({ appt, colors: c, onClose, onEdit, onCancel, onMarkPaid, onUnmarkPaid }: Props) {
  const [method, setMethod] = useState<PaymentMethod>(appt.paymentMethod ?? 'transferencia');

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[m.sheet, { backgroundColor: c.card }]}>
        <View style={[m.handle, { backgroundColor: c.border }]} />

        <View style={m.header}>
          <View style={[m.avatar, { backgroundColor: appt.patientAvatarColor + '25' }]}>
            <Text style={[m.avatarText, { color: appt.patientAvatarColor }]}>
              {appt.patientInitials}
            </Text>
          </View>
          <View style={m.headerInfo}>
            <Text style={[m.patientName, { color: c.text }]}>{appt.patientName}</Text>
            <Text style={[m.dateStr, { color: c.muted }]}>
              {formatDisplayDate(appt.date)}{appt.time ? ` · ${appt.time}` : ''}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={[m.closeBtn, { backgroundColor: c.mutedLight }]}>
            <Text style={[m.closeX, { color: c.muted }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={[m.divider, { backgroundColor: c.border }]} />

        <View style={m.details}>
          {([
            appt.duration > 0 ? ['Duración', `${appt.duration} minutos`] : null,
            ['Modalidad', appt.modality === 'virtual' ? 'Virtual' : 'Presencial'],
            ['Honorario', formatCurrency(appt.amount)],
          ].filter(Boolean) as [string, string][]).map(([label, value]) => (
            <View key={label} style={m.detailRow}>
              <Text style={[m.detailLabel, { color: c.muted }]}>{label}</Text>
              <Text style={[m.detailValue, { color: c.text }]}>{value}</Text>
            </View>
          ))}
          <View style={m.detailRow}>
            <Text style={[m.detailLabel, { color: c.muted }]}>Pago</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[m.detailValue, { color: appt.paid ? c.success : c.warning }]}>
                {appt.paid ? 'Cobrado' : 'Pendiente'}
              </Text>
              {appt.paid && appt.paymentMethod && (
                <View style={[m.methodPill, { backgroundColor: c.mutedLight }]}>
                  <Text style={[m.methodPillText, { color: c.muted }]}>
                    {appt.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={m.actions}>
          {onEdit && (
            <TouchableOpacity
              style={[m.actionBtn, { backgroundColor: c.accent }]}
              onPress={onEdit} activeOpacity={0.85}>
              <Text style={m.actionBtnText}>Editar turno</Text>
            </TouchableOpacity>
          )}

          {!appt.paid ? (
            <>
              <View style={[m.methodToggle, { backgroundColor: c.mutedLight }]}>
                {(['transferencia', 'efectivo'] as PaymentMethod[]).map(met => (
                  <TouchableOpacity
                    key={met}
                    onPress={() => setMethod(met)}
                    style={[
                      m.methodBtn,
                      method === met && {
                        backgroundColor: c.card,
                        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
                      },
                    ]}>
                    <Text style={[m.methodBtnText, { color: method === met ? c.text : c.muted }]}>
                      {met === 'transferencia' ? 'Transferencia' : 'Efectivo'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[m.actionBtn, { backgroundColor: c.success }]}
                onPress={() => onMarkPaid(method)} activeOpacity={0.85}>
                <Text style={m.actionBtnText}>Marcar como cobrado</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[m.cancelBtn, { borderColor: c.warning + '60' }]}
              onPress={onUnmarkPaid} activeOpacity={0.85}>
              <Text style={[m.cancelBtnText, { color: c.warning }]}>Desmarcar cobro</Text>
            </TouchableOpacity>
          )}

          {onCancel && (
            <TouchableOpacity
              style={[m.cancelBtn, { borderColor: c.danger + '60' }]}
              onPress={onCancel} activeOpacity={0.85}>
              <Text style={[m.cancelBtnText, { color: c.danger }]}>Cancelar turno</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const m = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#00000044' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 22, paddingBottom: 38,
    shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 }, elevation: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  headerInfo: { flex: 1 },
  patientName: { fontSize: 18, fontWeight: '800' },
  dateStr: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeX: { fontSize: 14, fontWeight: '700' },
  divider: { height: 1, marginBottom: 18 },
  details: { gap: 14, marginBottom: 22 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '700' },
  actions: { gap: 10 },
  actionBtn: {
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    shadowColor: '#BB8588', shadowOpacity: 0.18, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { paddingVertical: 13, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },
  methodToggle: { flexDirection: 'row', borderRadius: 11, padding: 3 },
  methodBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 9 },
  methodBtnText: { fontSize: 14, fontWeight: '700' },
  methodPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  methodPillText: { fontSize: 11, fontWeight: '700' },
});
