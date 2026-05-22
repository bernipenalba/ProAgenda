import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Text,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/context/AppContext';
import { Appointment } from '@/constants/MockData';
import { AppointmentModal } from '@/components/modals/AppointmentModal';
import { ApptDetailModal } from '@/components/modals/ApptDetailModal';
import { getTodayISO, parseLocalDate, buildDateISO } from '@/constants/dateUtils';

// ── constants ─────────────────────────────────────────────────────────────────

const TODAY = getTodayISO();
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

type ViewMode = 'dia' | 'semana';

// ── helpers ───────────────────────────────────────────────────────────────────

function addDays(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return buildDateISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function getWeekStart(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const dow = d.getDay();
  d.setDate(d.getDate() - ((dow + 6) % 7));
  return buildDateISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function formatCurrency(n: number) { return '$' + n.toLocaleString('es-AR'); }

function formatDisplayDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${DAYS_ES[d.getDay()]} ${d.getDate()} ${MONTHS_ES[d.getMonth()]}`;
}

// ── appointment card ──────────────────────────────────────────────────────────

function ApptCard({ appt, c, onPress }: { appt: Appointment; c: typeof Colors['light']; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[card.wrap, { backgroundColor: c.card, borderColor: c.border }]}
      onPress={onPress} activeOpacity={0.7}>
      <View style={[card.colorBar, { backgroundColor: appt.patientAvatarColor }]} />
      <View style={card.timeCol}>
        <Text style={[card.time, { color: c.accent }]}>{appt.time}</Text>
        <Text style={[card.dur, { color: c.muted }]}>{appt.duration}m</Text>
      </View>
      <View style={[card.avatar, { backgroundColor: appt.patientAvatarColor + '25' }]}>
        <Text style={[card.avatarText, { color: appt.patientAvatarColor }]}>{appt.patientInitials}</Text>
      </View>
      <View style={card.info}>
        <Text style={[card.name, { color: c.text }]}>{appt.patientName}</Text>
        <View style={card.metaRow}>
          <View style={[card.chip, { backgroundColor: appt.modality === 'virtual' ? c.accentLight : c.successLight }]}>
            <Text style={[card.chipText, { color: appt.modality === 'virtual' ? c.accent : c.success }]}>
              {appt.modality === 'virtual' ? 'Virtual' : 'Presencial'}
            </Text>
          </View>
        </View>
      </View>
      <View style={card.right}>
        <Text style={[card.amount, { color: c.text }]}>{formatCurrency(appt.amount)}</Text>
        <View style={[card.paidBadge, { backgroundColor: appt.paid ? c.successLight : c.warningLight }]}>
          <Text style={[card.paidText, { color: appt.paid ? c.success : c.warning }]}>
            {appt.paid ? 'Cobrado' : 'Pend.'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
    paddingRight: 14, paddingVertical: 13,
  },
  colorBar: { width: 4, alignSelf: 'stretch' },
  timeCol: { width: 44, alignItems: 'center' },
  time: { fontSize: 13, fontWeight: '800' },
  dur: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', marginBottom: 5 },
  metaRow: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  chipText: { fontSize: 11, fontWeight: '700' },
  right: { alignItems: 'flex-end', gap: 5 },
  amount: { fontSize: 13, fontWeight: '800' },
  paidBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  paidText: { fontSize: 10, fontWeight: '700' },
});

// ── main screen ───────────────────────────────────────────────────────────────

export default function CalendarioScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const { appointments, cancelAppointment, markAppointmentPaid, unmarkAppointmentPaid } = useApp();

  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [viewMode, setViewMode] = useState<ViewMode>('dia');
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  const weekStart = getWeekStart(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const apptsByDate: Record<string, Appointment[]> = {};
  appointments.forEach(a => {
    if (!apptsByDate[a.date]) apptsByDate[a.date] = [];
    apptsByDate[a.date].push(a);
  });

  const selectedDay = parseLocalDate(selectedDate);
  const monthYear = `${MONTHS_ES[selectedDay.getMonth()]} ${selectedDay.getFullYear()}`;

  function navigate(dir: -1 | 1) {
    setSelectedDate(prev => addDays(prev, viewMode === 'dia' ? dir : dir * 7));
  }

  const dayTotal = (apptsByDate[selectedDate] ?? []).reduce((sum, a) => sum + a.amount, 0);

  function handleCancel(id: string) {
    Alert.alert(
      'Cancelar turno',
      '¿Seguro que querés cancelar este turno?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => { cancelAppointment(id); setDetailAppt(null); },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── header ── */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <View>
          <Text style={[s.title, { color: c.text }]}>Agenda</Text>
          <Text style={[s.subtitle, { color: c.muted }]}>{monthYear}</Text>
        </View>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: c.accent }]}
          onPress={() => setShowNewAppt(true)}
          activeOpacity={0.85}>
          <Text style={s.addBtnText}>+ Turno</Text>
        </TouchableOpacity>
      </View>

      {/* ── view mode toggle ── */}
      <View style={[s.modeRow, { borderBottomColor: c.border }]}>
        <View style={[s.modePill, { backgroundColor: c.mutedLight }]}>
          {(['dia', 'semana'] as ViewMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[
                s.modeBtn,
                viewMode === mode && {
                  backgroundColor: c.card,
                  shadowColor: '#000', shadowOpacity: 0.06,
                  shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2,
                },
              ]}>
              <Text style={[s.modeBtnText, { color: viewMode === mode ? c.text : c.muted }]}>
                {mode === 'dia' ? 'Día' : 'Semana'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.navRow}>
          <TouchableOpacity onPress={() => navigate(-1)} style={[s.navBtn, { backgroundColor: c.mutedLight }]}>
            <Text style={[s.navBtnText, { color: c.text }]}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelectedDate(TODAY)} style={[s.todayBtn, { borderColor: c.border }]}>
            <Text style={[s.todayBtnText, { color: c.accent }]}>Hoy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigate(1)} style={[s.navBtn, { backgroundColor: c.mutedLight }]}>
            <Text style={[s.navBtnText, { color: c.text }]}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── week days row ── */}
      <View style={[s.weekRow, { borderBottomColor: c.border, backgroundColor: c.card }]}>
        {weekDays.map(date => {
          const d = parseLocalDate(date);
          const isSelected = date === selectedDate;
          const isToday = date === TODAY;
          const hasAppt = (apptsByDate[date] ?? []).length > 0;
          return (
            <TouchableOpacity key={date} onPress={() => setSelectedDate(date)} style={s.weekDayCol}>
              <Text style={[s.weekDayLabel, { color: isSelected ? c.accent : c.muted }]}>
                {DAYS_ES[d.getDay()]}
              </Text>
              <View style={[
                s.weekDayNum,
                isSelected && { backgroundColor: c.accent },
                isToday && !isSelected && { borderWidth: 1.5, borderColor: c.accent },
              ]}>
                <Text style={[s.weekDayNumText, { color: isSelected ? '#fff' : c.text }]}>
                  {d.getDate()}
                </Text>
              </View>
              {hasAppt && (
                <View style={[s.weekDot, { backgroundColor: isSelected ? c.accent : c.muted + '60' }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {viewMode === 'dia' ? (
          <>
            {(apptsByDate[selectedDate] ?? []).length > 0 && (
              <View style={[s.daySummary, { backgroundColor: c.accentLight }]}>
                <Text style={[s.daySummaryText, { color: c.accent }]}>
                  {(apptsByDate[selectedDate] ?? []).length} turno{(apptsByDate[selectedDate] ?? []).length !== 1 ? 's' : ''}
                  {dayTotal > 0 && ` · ${formatCurrency(dayTotal)}`}
                </Text>
              </View>
            )}
            {(apptsByDate[selectedDate] ?? []).length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[s.emptyTitle, { color: c.text }]}>Sin turnos</Text>
                <Text style={[s.emptyText, { color: c.muted }]}>
                  No hay turnos para {formatDisplayDate(selectedDate)}
                </Text>
                <TouchableOpacity
                  style={[s.emptyBtn, { backgroundColor: c.accent }]}
                  onPress={() => setShowNewAppt(true)}
                  activeOpacity={0.85}>
                  <Text style={s.emptyBtnText}>+ Agregar turno</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.apptList}>
                {(apptsByDate[selectedDate] ?? [])
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map(appt => (
                    <ApptCard key={appt.id} appt={appt} c={c} onPress={() => setDetailAppt(appt)} />
                  ))}
              </View>
            )}
          </>
        ) : (
          <View style={s.weekView}>
            {weekDays.map(date => {
              const dayAppts = (apptsByDate[date] ?? []).sort((a, b) => a.time.localeCompare(b.time));
              if (dayAppts.length === 0) return null;
              const isToday = date === TODAY;
              return (
                <View key={date}>
                  <View style={s.weekDayHeader}>
                    <Text style={[s.weekDayHeaderText, { color: isToday ? c.accent : c.muted }]}>
                      {formatDisplayDate(date)}
                    </Text>
                    {isToday && (
                      <View style={[s.todayPill, { backgroundColor: c.accentLight }]}>
                        <Text style={[s.todayPillText, { color: c.accent }]}>Hoy</Text>
                      </View>
                    )}
                  </View>
                  <View style={s.apptList}>
                    {dayAppts.map(appt => (
                      <ApptCard key={appt.id} appt={appt} c={c} onPress={() => setDetailAppt(appt)} />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── detail modal ── */}
      {detailAppt && (
        <ApptDetailModal
          appt={detailAppt}
          colors={c}
          onClose={() => setDetailAppt(null)}
          onEdit={() => { setEditingAppt(detailAppt); setDetailAppt(null); }}
          onCancel={() => handleCancel(detailAppt.id)}
          onMarkPaid={(method) => { markAppointmentPaid(detailAppt.id, method); setDetailAppt(null); }}
          onUnmarkPaid={() => { unmarkAppointmentPaid(detailAppt.id); setDetailAppt(null); }}
        />
      )}

      <AppointmentModal
        visible={showNewAppt}
        defaultDate={selectedDate}
        onClose={() => setShowNewAppt(false)}
      />
      <AppointmentModal
        visible={!!editingAppt}
        appointment={editingAppt ?? undefined}
        onClose={() => setEditingAppt(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  addBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
    shadowColor: '#BB8588', shadowOpacity: 0.25, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  modePill: { flexDirection: 'row', borderRadius: 10, padding: 3 },
  modeBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8 },
  modeBtnText: { fontSize: 13, fontWeight: '700' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { fontSize: 20, fontWeight: '600', lineHeight: 22 },
  todayBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  todayBtnText: { fontSize: 13, fontWeight: '700' },
  weekRow: {
    flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 10, borderBottomWidth: 1,
  },
  weekDayCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekDayLabel: { fontSize: 11, fontWeight: '600' },
  weekDayNum: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  weekDayNumText: { fontSize: 13, fontWeight: '700' },
  weekDot: { width: 5, height: 5, borderRadius: 3 },
  daySummary: {
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    alignSelf: 'flex-start', marginBottom: 14,
  },
  daySummaryText: { fontSize: 13, fontWeight: '700' },
  apptList: { gap: 10, marginBottom: 16 },
  emptyCard: { borderRadius: 18, padding: 32, borderWidth: 1, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 14, textAlign: 'center' },
  emptyBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  weekView: { gap: 6 },
  weekDayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 8 },
  weekDayHeaderText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  todayPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  todayPillText: { fontSize: 11, fontWeight: '700' },
});
