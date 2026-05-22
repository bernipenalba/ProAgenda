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
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/context/AppContext';
import { PatientModal } from '@/components/modals/PatientModal';
import { AppointmentModal } from '@/components/modals/AppointmentModal';
import { ApptDetailModal } from '@/components/modals/ApptDetailModal';
import { Appointment } from '@/constants/MockData';
import { getTodayISO, parseLocalDate, buildDateISO } from '@/constants/dateUtils';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('es-AR');
}

const TODAY = getTodayISO();
const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function getWeekDays(): { label: string; date: string; num: number; isToday: boolean }[] {
  const base = parseLocalDate(TODAY);
  const dow = base.getDay();
  const monday = new Date(base);
  monday.setDate(base.getDate() - ((dow + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = buildDateISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { label: DAYS_ES[d.getDay()], date: iso, num: d.getDate(), isToday: iso === TODAY };
  });
}

function formatTodayLong(): string {
  const d = parseLocalDate(TODAY);
  const weekday = DAYS_ES[d.getDay()];
  const month = MONTHS_ES[d.getMonth()];
  return `${weekday}, ${d.getDate()} de ${month}`;
}

// ── stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent, bg, onPress }: {
  label: string; value: string; accent: string; bg: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[statS.card, { backgroundColor: bg }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}>
      <Text style={[statS.value, { color: accent }]}>{value}</Text>
      <Text style={[statS.label, { color: accent + 'AA' }]}>{label}</Text>
      {onPress && <Text style={[statS.arrow, { color: accent + '66' }]}>›</Text>}
    </TouchableOpacity>
  );
}

const statS = StyleSheet.create({
  card: {
    flex: 1, borderRadius: 16, padding: 16, gap: 2,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  value: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },
  arrow: { fontSize: 18, fontWeight: '700', marginTop: 2 },
});

// ── main screen ───────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const router = useRouter();
  const { patients, appointments, cancelAppointment, markAppointmentPaid, unmarkAppointmentPaid } = useApp();

  const [showNewPatient, setShowNewPatient] = useState(false);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [selectedDay, setSelectedDay] = useState(TODAY);
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  function handleCancelAppt(id: string) {
    Alert.alert(
      'Cancelar turno',
      '¿Seguro que querés cancelar este turno?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => { cancelAppointment(id); setDetailAppt(null); } },
      ]
    );
  }

  // ── metrics ──
  // Turnos: appointments this calendar month
  const currentMonthStr = TODAY.slice(0, 7);
  const monthTurnos = appointments.filter(a => a.date.startsWith(currentMonthStr)).length;

  // Pacientes: total registered patients (same source as the Pacientes tab)
  const totalPatients = patients.length;

  // Pagos pend.: patients who have at least one overdue unpaid session (date < today).
  // Identical criterion to the "Pagos pendientes" list in Finanzas so both numbers
  // always agree.
  const debtorCount = patients.filter(p =>
    p.sessions.some(s => s.status !== 'cancelada' && !s.paid && s.date < TODAY)
  ).length;

  // Total income: all paid sessions ever (same as Finanzas hero card)
  const allPaidSessions = patients.flatMap(p => p.sessions).filter(s => s.paid);
  const totalIncome = allPaidSessions.reduce((sum, s) => sum + s.amount, 0);

  const todayAppointments = appointments
    .filter(a => a.date === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  const weekDays = getWeekDays();
  const apptsByDay: Record<string, number> = {};
  appointments.forEach(a => { apptsByDay[a.date] = (apptsByDay[a.date] ?? 0) + 1; });

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── header ── */}
        <View style={s.header}>
          <View>
            <Text style={[s.greeting, { color: c.muted }]}>{formatTodayLong()}</Text>
            <Text style={[s.name, { color: c.text }]}>Buen día</Text>
          </View>
          <View style={[s.avatar, { backgroundColor: c.accentLight }]}>
            <Text style={[s.avatarText, { color: c.accent }]}>P</Text>
          </View>
        </View>

        {/* ── income hero card ── */}
        <View style={[s.heroCard, { backgroundColor: c.accent }]}>
          <Text style={s.heroLabel}>Ganancias cobradas</Text>
          <Text style={s.heroAmount}>{formatCurrency(totalIncome)}</Text>
          <View style={s.heroRow}>
            <Text style={s.heroSub}>Total histórico</Text>
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeText}>{allPaidSessions.length} sesiones cobradas</Text>
            </View>
          </View>
        </View>

        {/* ── stats row ── */}
        <View style={s.statsRow}>
          <StatCard
            label="Turnos" value={String(monthTurnos)} accent={c.accent} bg={c.accentLight}
            onPress={() => router.push('/(tabs)/calendario' as any)} />
          <StatCard
            label="Pacientes" value={String(totalPatients)} accent={c.success} bg={c.successLight}
            onPress={() => router.push('/(tabs)/explore' as any)} />
          <StatCard
            label="Pacientes con deuda" value={String(debtorCount)} accent={c.warning} bg={c.warningLight}
            onPress={() => router.push('/(tabs)/finanzas' as any)} />
        </View>

        {/* ── quick actions ── */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionPrimary, { backgroundColor: c.accent }]}
            onPress={() => setShowNewAppt(true)}
            activeOpacity={0.85}>
            <Text style={s.actionPrimaryText}>+ Nuevo turno</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionSecondary, { backgroundColor: c.card, borderColor: c.border }]}
            onPress={() => setShowNewPatient(true)}
            activeOpacity={0.85}>
            <Text style={[s.actionSecondaryText, { color: c.text }]}>+ Nuevo paciente</Text>
          </TouchableOpacity>
        </View>

        {/* ── weekly mini calendar ── */}
        <View style={[s.section, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[s.sectionTitle, { color: c.muted }]}>ESTA SEMANA</Text>
          <View style={s.weekRow}>
            {weekDays.map(day => {
              const hasAppt = (apptsByDay[day.date] ?? 0) > 0;
              const isSelected = day.date === selectedDay;
              return (
                <TouchableOpacity
                  key={day.date}
                  style={s.dayCol}
                  onPress={() => setSelectedDay(day.date)}
                  activeOpacity={0.7}>
                  <Text style={[s.dayLabel, { color: isSelected ? c.accent : c.muted }]}>
                    {day.label}
                  </Text>
                  <View style={[
                    s.dayNum,
                    isSelected && { backgroundColor: c.accent },
                    day.isToday && !isSelected && { borderWidth: 1.5, borderColor: c.accent },
                  ]}>
                    <Text style={[s.dayNumText, { color: isSelected ? '#fff' : c.text }]}>
                      {day.num}
                    </Text>
                  </View>
                  {hasAppt && (
                    <View style={[s.dot, { backgroundColor: isSelected ? c.accent : c.muted + '60' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── selected day appointments ── */}
        <View style={s.apptHeader}>
          <Text style={[s.sectionTitle, { color: c.muted }]}>
            {selectedDay === TODAY ? 'HOY' : DAYS_ES[parseLocalDate(selectedDay).getDay()].toUpperCase()}
          </Text>
          <Text style={[s.apptCount, { color: c.accent }]}>
            {todayAppointments.length} turno{todayAppointments.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {todayAppointments.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.emptyText, { color: c.muted }]}>
              Sin turnos para {selectedDay === TODAY ? 'hoy' : parseLocalDate(selectedDay).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
            </Text>
          </View>
        ) : (
          <View style={s.apptList}>
            {todayAppointments.map(appt => (
              <TouchableOpacity
                key={appt.id}
                style={[s.apptCard, { backgroundColor: c.card, borderColor: c.border }]}
                onPress={() => setDetailAppt(appt)}
                activeOpacity={0.7}>
                <View style={s.apptLeft}>
                  <Text style={[s.apptTime, { color: c.accent }]}>{appt.time}</Text>
                  <View style={[s.timeBar, { backgroundColor: c.border }]} />
                </View>
                <View style={[s.apptAvatar, { backgroundColor: appt.patientAvatarColor + '25' }]}>
                  <Text style={[s.apptAvatarText, { color: appt.patientAvatarColor }]}>
                    {appt.patientInitials}
                  </Text>
                </View>
                <View style={s.apptInfo}>
                  <Text style={[s.apptName, { color: c.text }]}>{appt.patientName}</Text>
                  <View style={s.apptMeta}>
                    <View style={[
                      s.modalityBadge,
                      { backgroundColor: appt.modality === 'virtual' ? c.accentLight : c.successLight },
                    ]}>
                      <Text style={[
                        s.modalityText,
                        { color: appt.modality === 'virtual' ? c.accent : c.success },
                      ]}>
                        {appt.modality === 'virtual' ? 'Virtual' : 'Presencial'}
                      </Text>
                    </View>
                    <Text style={[s.apptDuration, { color: c.muted }]}>{appt.duration} min</Text>
                  </View>
                </View>
                <View style={s.apptRight}>
                  <Text style={[s.apptAmount, { color: c.text }]}>{formatCurrency(appt.amount)}</Text>
                  <View style={[s.paidBadge, { backgroundColor: appt.paid ? c.successLight : c.warningLight }]}>
                    <Text style={[s.paidText, { color: appt.paid ? c.success : c.warning }]}>
                      {appt.paid ? 'Cobrado' : 'Pendiente'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      <PatientModal visible={showNewPatient} onClose={() => setShowNewPatient(false)} />
      <AppointmentModal visible={showNewAppt} defaultDate={selectedDay} onClose={() => setShowNewAppt(false)} />
      <AppointmentModal
        visible={!!editingAppt}
        appointment={editingAppt ?? undefined}
        onClose={() => setEditingAppt(null)}
      />
      {detailAppt && (
        <ApptDetailModal
          appt={detailAppt}
          colors={c}
          onClose={() => setDetailAppt(null)}
          onEdit={() => { setEditingAppt(detailAppt); setDetailAppt(null); }}
          onCancel={() => handleCancelAppt(detailAppt.id)}
          onMarkPaid={(method) => { markAppointmentPaid(detailAppt.id, method); setDetailAppt(null); }}
          onUnmarkPaid={() => { unmarkAppointmentPaid(detailAppt.id); setDetailAppt(null); }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 3 },
  name: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800' },
  heroCard: {
    borderRadius: 22, padding: 22, marginBottom: 16,
    shadowColor: '#BB8588', shadowOpacity: 0.22, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 6, gap: 6,
  },
  heroLabel: { color: '#ffffff99', fontSize: 13, fontWeight: '600', letterSpacing: 0.3 },
  heroAmount: { color: '#fff', fontSize: 38, fontWeight: '900', letterSpacing: -1.5, marginBottom: 2 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroSub: { color: '#ffffffBB', fontSize: 13 },
  heroBadge: { backgroundColor: '#ffffff22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  actionPrimary: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
    shadowColor: '#BB8588', shadowOpacity: 0.28, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  actionPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  actionSecondary: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
  actionSecondaryText: { fontSize: 15, fontWeight: '700' },
  section: {
    borderRadius: 18, padding: 18, borderWidth: 1, marginBottom: 22,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 16 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol: { alignItems: 'center', gap: 5, flex: 1 },
  dayLabel: { fontSize: 11, fontWeight: '600' },
  dayNum: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayNumText: { fontSize: 14, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3 },
  apptHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  apptCount: { fontSize: 13, fontWeight: '700' },
  apptList: { gap: 10, marginBottom: 20 },
  apptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 15,
    borderRadius: 16, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  apptLeft: { alignItems: 'center', width: 40, gap: 4 },
  apptTime: { fontSize: 13, fontWeight: '800' },
  timeBar: { width: 1.5, height: 20, borderRadius: 1 },
  apptAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  apptAvatarText: { fontSize: 13, fontWeight: '800' },
  apptInfo: { flex: 1, gap: 5 },
  apptName: { fontSize: 14, fontWeight: '700' },
  apptMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  modalityText: { fontSize: 11, fontWeight: '700' },
  apptDuration: { fontSize: 11, fontWeight: '500' },
  apptRight: { alignItems: 'flex-end', gap: 5 },
  apptAmount: { fontSize: 13, fontWeight: '800' },
  paidBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  paidText: { fontSize: 11, fontWeight: '700' },
  emptyCard: { borderRadius: 16, padding: 24, borderWidth: 1, alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 14 },
});
