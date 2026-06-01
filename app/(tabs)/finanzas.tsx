import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/context/AppContext';
import { PaymentModal } from '@/components/modals/PaymentModal';
import { Session } from '@/constants/MockData';
import { getTodayISO, parseLocalDate, buildDateISO, formatTodayCompact } from '@/constants/dateUtils';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('es-AR');
}

type Period = 'semana' | 'mes';

const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function getHeaderMonthYear(): string {
  const d = parseLocalDate(getTodayISO());
  const name = MONTHS_LONG[d.getMonth()];
  return name.charAt(0).toUpperCase() + name.slice(1) + ' ' + d.getFullYear();
}

// ── chart builders ────────────────────────────────────────────────────────────

type BarItem = { label: string; amount: number };
type ChartResult = { data: BarItem[]; highlightIndex: number; subtitle: string };

const MONTHS_PER_PAGE = 4;

function buildWeekChart(paid: Session[], weekOffset: number): ChartResult {
  const today = parseLocalDate(getTodayISO());
  const dow = today.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diffToMon + weekOffset * 7);

  const data: BarItem[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((label, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = buildDateISO(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const amount = paid.filter(s => s.date === dateStr).reduce((sum, s) => sum + s.amount, 0);
    return { label, amount };
  });

  const todayStr = getTodayISO();
  const todayIdx = weekOffset === 0 ? (dow + 6) % 7 : -1;

  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  const MONTHS_SH = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  const subtitle = `${monday.getDate()} al ${sunday.getDate()} ${MONTHS_SH[sunday.getMonth()]}`;

  return { data, highlightIndex: todayIdx, subtitle };
}

function buildMonthChart(paid: Session[], pageStart: number): ChartResult & { hasPrev: boolean; hasNext: boolean } {
  const today = parseLocalDate(getTodayISO());
  const year = today.getFullYear();
  const currentMonth = today.getMonth();

  const allMonths: BarItem[] = MONTHS_SHORT.slice(0, currentMonth + 1).map((label, i) => {
    const amount = paid.filter(s => {
      const d = parseLocalDate(s.date);
      return d.getFullYear() === year && d.getMonth() === i;
    }).reduce((sum, s) => sum + s.amount, 0);
    return { label, amount };
  });

  const page = allMonths.slice(pageStart, pageStart + MONTHS_PER_PAGE);
  const hiInPage = currentMonth - pageStart;
  const highlightIndex = hiInPage >= 0 && hiInPage < MONTHS_PER_PAGE ? hiInPage : -1;

  return {
    data: page,
    highlightIndex,
    subtitle: String(year),
    hasPrev: pageStart > 0,
    hasNext: pageStart + MONTHS_PER_PAGE < allMonths.length,
  };
}

// ── bar chart ─────────────────────────────────────────────────────────────────

function BarChart({ data, accent, muted, mutedLight, highlightIndex }: {
  data: BarItem[];
  accent: string; muted: string; mutedLight: string;
  highlightIndex: number;
}) {
  const max = Math.max(...data.map(d => d.amount), 1);
  return (
    <View style={chart.bars}>
      {data.map((d, i) => {
        const pct = d.amount / max;
        const isHi = i === highlightIndex;
        return (
          <View key={`${d.label}-${i}`} style={chart.barCol}>
            <Text style={[chart.barValue, { color: isHi ? accent : muted }]}>
              {d.amount >= 1000 ? `$${(d.amount / 1000).toFixed(0)}k` : d.amount > 0 ? `$${d.amount}` : ''}
            </Text>
            <View style={[chart.barTrack, { backgroundColor: mutedLight }]}>
              <View style={[
                chart.barFill,
                {
                  height: `${Math.max(pct * 100, 4)}%`,
                  backgroundColor: isHi ? accent : accent + '50',
                  borderRadius: 5,
                },
              ]} />
            </View>
            <Text style={[chart.barLabel, { color: isHi ? accent : muted, fontWeight: isHi ? '700' : '500' }]}>
              {d.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const chart = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
  barValue: { fontSize: 9, fontWeight: '600' },
  barTrack: { flex: 1, width: '100%', borderRadius: 5, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%' },
  barLabel: { fontSize: 10 },
});

// ── stat card ─────────────────────────────────────────────────────────────────

function FinStat({ label, value, sub, accent, bg }: {
  label: string; value: string; sub?: string; accent: string; bg: string;
}) {
  return (
    <View style={[fst.card, { backgroundColor: bg }]}>
      <Text style={[fst.value, { color: accent }]}>{value}</Text>
      <Text style={[fst.label, { color: accent + 'BB' }]}>{label}</Text>
      {sub && <Text style={[fst.sub, { color: accent + '88' }]}>{sub}</Text>}
    </View>
  );
}

const fst = StyleSheet.create({
  card: {
    flex: 1, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1, gap: 2,
  },
  value: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  label: { fontSize: 11, fontWeight: '600' },
  sub: { fontSize: 10, fontWeight: '500', marginTop: 2 },
});

// ── pending row ───────────────────────────────────────────────────────────────

function PendingRow({
  name, initials, avatarColor, sessions, totalOwed, onPress, c,
}: {
  name: string; initials: string; avatarColor: string;
  sessions: number; totalOwed: number;
  onPress: () => void;
  c: typeof Colors['light'];
}) {
  return (
    <TouchableOpacity
      style={[pr.wrap, { borderColor: c.border }]}
      onPress={onPress} activeOpacity={0.7}>
      <View style={[pr.avatar, { backgroundColor: avatarColor + '22' }]}>
        <Text style={[pr.avatarText, { color: avatarColor }]}>{initials}</Text>
      </View>
      <View style={pr.info}>
        <Text style={[pr.name, { color: c.text }]}>{name}</Text>
        <Text style={[pr.sub, { color: c.muted }]}>{sessions} sesión{sessions !== 1 ? 'es' : ''} sin cobrar</Text>
      </View>
      <View style={[pr.badge, { backgroundColor: c.dangerLight }]}>
        <Text style={[pr.badgeText, { color: c.danger }]}>{formatCurrency(totalOwed)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const pr = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 13, fontWeight: '800' },
});

// ── main screen ───────────────────────────────────────────────────────────────

export default function FinanzasScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const { patients, appointments } = useApp();
  const [period, setPeriod] = useState<Period>('mes');
  const [paymentPatientId, setPaymentPatientId] = useState<string | null>(null);

  // chart navigation state
  const [weekOffset, setWeekOffset] = useState(0);
  const today = parseLocalDate(getTodayISO());
  const initialPage = Math.floor(today.getMonth() / MONTHS_PER_PAGE) * MONTHS_PER_PAGE;
  const [monthPageStart, setMonthPageStart] = useState(initialPage);

  // reset nav state when switching period
  useEffect(() => {
    const m = parseLocalDate(getTodayISO()).getMonth();
    setWeekOffset(0);
    setMonthPageStart(Math.floor(m / MONTHS_PER_PAGE) * MONTHS_PER_PAGE);
  }, [period]);

  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  // ── aggregates ───────────────────────────────────────────────────────────────
  // All calculations use patient sessions as the single source of truth.
  const todayStr = getTodayISO();
  const allSessions = patients.flatMap(p => p.sessions);

  // Total income = all paid sessions ever (matches Dashboard hero card)
  const paidSessions = allSessions.filter(s => s.paid);
  const totalIncome = paidSessions.reduce((sum, s) => sum + s.amount, 0);

  // Debtors: patients who ADEUDA (= have at least one strictly-past unpaid session).
  // The per-patient session count includes today (date <= today) to match PaymentModal.
  const debtors = patients
    .filter(p => p.sessions.some(s => s.status !== 'cancelada' && !s.paid && s.date < todayStr))
    .map(p => {
      const unpaid = p.sessions.filter(s => s.status !== 'cancelada' && !s.paid && s.date <= todayStr);
      return {
        patient: p,
        sessions: unpaid.length,
        totalOwed: unpaid.reduce((sum, s) => sum + s.amount, 0),
      };
    });
  const totalDebt = debtors.reduce((sum, d) => sum + d.totalOwed, 0);

  // "Turnos sin cobrar" count derived from the debtors list so the stat card
  // always shows the exact same number as the sum of sessions in the list rows.
  const sinCobrarCount = debtors.reduce((sum, d) => sum + d.sessions, 0);

  // Build recent payments from sessions (not appointments) so that cobros
  // registered via PaymentModal on sessions without a calendar entry are
  // included. Enrich each with patient info and linked appointment modality.
  const recentPaid = patients
    .flatMap(p =>
      p.sessions
        .filter(s => s.paid)
        .map(s => {
          const linkedAppt = s.appointmentId
            ? appointments.find(a => a.id === s.appointmentId)
            : undefined;
          return {
            id: s.id,
            date: s.date,
            paidAt: s.paidAt,
            time: linkedAppt?.time ?? '',
            amount: s.amount,
            paymentMethod: s.paymentMethod,
            patientName: p.name,
            patientInitials: p.initials,
            patientAvatarColor: p.avatarColor,
            modality: linkedAppt?.modality as string | undefined,
          };
        })
    )
    .sort((a, b) =>
      (b.paidAt ?? b.date + 'T00:00:00').localeCompare(a.paidAt ?? a.date + 'T00:00:00')
    )
    .slice(0, 20);

  // dynamic chart — dep on patients (stable state ref)
  const chartResult = useMemo(() => {
    const paid = patients.flatMap(p => p.sessions).filter(s => s.status === 'realizada' && s.paid);
    if (period === 'semana') return buildWeekChart(paid, weekOffset);
    return buildMonthChart(paid, monthPageStart);
  }, [period, weekOffset, monthPageStart, patients]);

  const canGoPrev = period === 'semana' ? true : ((chartResult as any).hasPrev ?? false);
  const canGoNext = period === 'semana' ? weekOffset < 0 : ((chartResult as any).hasNext ?? false);

  function navPrev() {
    if (period === 'semana') setWeekOffset(o => o - 1);
    else setMonthPageStart(p => Math.max(0, p - MONTHS_PER_PAGE));
  }
  function navNext() {
    if (!canGoNext) return;
    if (period === 'semana') setWeekOffset(o => o + 1);
    else {
      const maxStart = Math.floor(today.getMonth() / MONTHS_PER_PAGE) * MONTHS_PER_PAGE;
      setMonthPageStart(p => Math.min(maxStart, p + MONTHS_PER_PAGE));
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View style={[s.header, { borderBottomColor: c.border }]}>
        <View>
          <Text style={[s.dateLabel, { color: c.muted }]}>{formatTodayCompact()}</Text>
          <Text style={[s.title, { color: c.text }]}>Finanzas</Text>
          <Text style={[s.subtitle, { color: c.muted }]}>{getHeaderMonthYear()}</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── hero ── */}
        <View style={[s.heroCard, { backgroundColor: c.accent }]}>
          <Text style={s.heroLabel}>Total cobrado</Text>
          <Text style={s.heroAmount}>{formatCurrency(totalIncome)}</Text>
          <View style={s.heroRow}>
            <View style={s.heroBadge}>
              <Text style={s.heroBadgeText}>{paidSessions.length} sesiones cobradas</Text>
            </View>
          </View>
        </View>

        {/* ── stats ── */}
        <View style={s.statsRow}>
          <FinStat
            label="Total adeudado"
            value={formatCurrency(totalDebt)}
            sub={`${debtors.length} paciente${debtors.length !== 1 ? 's' : ''}`}
            accent={c.warning} bg={c.warningLight}
          />
          <FinStat
            label="Turnos sin cobrar"
            value={String(sinCobrarCount)}
            sub={`${debtors.length} paciente${debtors.length !== 1 ? 's' : ''}`}
            accent={c.danger} bg={c.dangerLight}
          />
        </View>

        {/* ── chart ── */}
        <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {/* period toggle */}
          <View style={s.cardHeader}>
            <Text style={[s.sectionTitle, { color: c.muted }]}>INGRESOS</Text>
            <View style={[s.periodPill, { backgroundColor: c.mutedLight }]}>
              {(['semana', 'mes'] as Period[]).map(p => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={[
                    s.periodBtn,
                    period === p && {
                      backgroundColor: c.card,
                      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
                    },
                  ]}>
                  <Text style={[s.periodBtnText, { color: period === p ? c.text : c.muted }]}>
                    {p === 'semana' ? 'Semana' : 'Mes'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* chart navigation row */}
          <View style={s.chartNav}>
            <TouchableOpacity
              onPress={navPrev}
              style={[s.navArrow, { backgroundColor: c.mutedLight, opacity: canGoPrev ? 1 : 0.3 }]}
              activeOpacity={0.7}
              disabled={!canGoPrev}>
              <Text style={[s.navArrowText, { color: c.muted }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[s.chartSubtitle, { color: c.muted }]}>{chartResult.subtitle}</Text>
            <TouchableOpacity
              onPress={navNext}
              style={[s.navArrow, { backgroundColor: c.mutedLight, opacity: canGoNext ? 1 : 0.3 }]}
              activeOpacity={0.7}
              disabled={!canGoNext}>
              <Text style={[s.navArrowText, { color: c.muted }]}>›</Text>
            </TouchableOpacity>
          </View>

          <BarChart
            data={chartResult.data}
            accent={c.accent}
            muted={c.muted}
            mutedLight={c.mutedLight}
            highlightIndex={chartResult.highlightIndex}
          />
        </View>

        {/* ── pending payments ── */}
        {debtors.length > 0 && (
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={s.cardHeader}>
              <Text style={[s.sectionTitle, { color: c.muted }]}>PAGOS PENDIENTES</Text>
              <View style={[s.debtTotal, { backgroundColor: c.dangerLight }]}>
                <Text style={[s.debtTotalText, { color: c.danger }]}>{formatCurrency(totalDebt)}</Text>
              </View>
            </View>
            {debtors.map(d => (
              <PendingRow
                key={d.patient.id}
                name={d.patient.name}
                initials={d.patient.initials}
                avatarColor={d.patient.avatarColor}
                sessions={d.sessions}
                totalOwed={d.totalOwed}
                onPress={() => setPaymentPatientId(d.patient.id)}
                c={c}
              />
            ))}
          </View>
        )}

        {/* ── recent payments ── */}
        {recentPaid.length > 0 && (
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.sectionTitle, { color: c.muted }]}>COBROS RECIENTES</Text>
            <View>
              {recentPaid.map((payment, idx) => (
                <View
                  key={payment.id}
                  style={[s.txRow, { borderBottomColor: idx < recentPaid.length - 1 ? c.border : 'transparent' }]}>
                  <View style={[s.txAvatar, { backgroundColor: payment.patientAvatarColor + '22' }]}>
                    <Text style={[s.txAvatarText, { color: payment.patientAvatarColor }]}>
                      {payment.patientInitials}
                    </Text>
                  </View>
                  <View style={s.txInfo}>
                    <Text style={[s.txName, { color: c.text }]}>{payment.patientName}</Text>
                    <Text style={[s.txDate, { color: c.muted }]}>
                      {parseLocalDate(payment.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      {payment.modality ? ` · ${payment.modality === 'virtual' ? 'Virtual' : 'Presencial'}` : ''}
                    </Text>
                  </View>
                  <View style={s.txRight}>
                    <Text style={[s.txAmount, { color: c.success }]}>+{formatCurrency(payment.amount)}</Text>
                    {payment.paymentMethod && (
                      <View style={[s.txMethodBadge, { backgroundColor: c.mutedLight }]}>
                        <Text style={[s.txMethodText, { color: c.muted }]}>
                          {payment.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transf.'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <PaymentModal
        visible={!!paymentPatientId}
        patientId={paymentPatientId}
        onClose={() => setPaymentPatientId(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1,
  },
  dateLabel: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontWeight: '500', marginTop: 2 },
  heroCard: {
    borderRadius: 22, padding: 22, marginBottom: 12,
    shadowColor: '#BB8588', shadowOpacity: 0.22, shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }, elevation: 6, gap: 4,
  },
  heroLabel: { color: '#ffffff99', fontSize: 13, fontWeight: '600' },
  heroAmount: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  heroRow: { flexDirection: 'row', marginTop: 4 },
  heroBadge: { backgroundColor: '#ffffff22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  card: {
    borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  periodPill: { flexDirection: 'row', borderRadius: 8, padding: 2 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  periodBtnText: { fontSize: 12, fontWeight: '700' },
  chartNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
  },
  navArrow: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  navArrowText: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  chartSubtitle: { fontSize: 13, fontWeight: '600' },
  debtTotal: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  debtTotalText: { fontSize: 13, fontWeight: '800' },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  txAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txAvatarText: { fontSize: 12, fontWeight: '800' },
  txInfo: { flex: 1 },
  txName: { fontSize: 14, fontWeight: '700' },
  txDate: { fontSize: 12, marginTop: 2 },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  txMethodBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  txMethodText: { fontSize: 10, fontWeight: '700' },
});
