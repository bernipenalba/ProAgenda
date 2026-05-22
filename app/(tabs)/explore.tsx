import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/context/AppContext';
import { PaymentStatus } from '@/constants/MockData';
import { PatientModal } from '@/components/modals/PatientModal';
import { formatTodayCompact } from '@/constants/dateUtils';

type FilterPayment = 'todos' | PaymentStatus;

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  al_dia: 'Al día',
  pendiente: 'Pendiente',
  adeuda: 'Adeuda',
};

export default function PacientesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const router = useRouter();
  const { patients, deletePatient } = useApp();

  const [search, setSearch] = useState('');
  const [filterPayment, setFilterPayment] = useState<FilterPayment>('todos');
  const [showNewPatient, setShowNewPatient] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  const filtered = useMemo(() => {
    let result = patients.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      const matchPayment = filterPayment === 'todos' || p.paymentStatus === filterPayment;
      return matchSearch && matchPayment;
    });

    if (filterPayment === 'todos') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'es'));
    } else if (filterPayment === 'pendiente') {
      result = [...result].sort((a, b) => {
        const aDate = a.nextSession ?? '9999';
        const bDate = b.nextSession ?? '9999';
        return aDate.localeCompare(bDate);
      });
    }

    return result;
  }, [patients, search, filterPayment]);

  function getPaymentColor(status: PaymentStatus) {
    if (status === 'al_dia') return { bg: c.successLight, text: c.success };
    if (status === 'pendiente') return { bg: c.warningLight, text: c.warning };
    return { bg: c.dangerLight, text: c.danger };
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert(
      'Eliminar paciente',
      `¿Seguro que querés eliminar a ${name}? Esto también eliminará sus turnos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deletePatient(id) },
      ]
    );
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── header ── */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <View>
          <Text style={[s.dateLabel, { color: c.muted }]}>{formatTodayCompact()}</Text>
          <Text style={[s.title, { color: c.text }]}>Pacientes</Text>
          <Text style={[s.subtitle, { color: c.muted }]}>{patients.length} paciente{patients.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: c.accent }]}
          onPress={() => setShowNewPatient(true)}
          activeOpacity={0.85}>
          <Text style={s.addBtnText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── search ── */}
        <View style={[s.searchWrap, { backgroundColor: c.mutedLight, borderColor: c.border }]}>
          <Text style={[s.searchIcon, { color: c.muted }]}>🔍</Text>
          <TextInput
            style={[s.searchInput, { color: c.text }]}
            placeholder="Buscar paciente..."
            placeholderTextColor={c.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={[s.clearBtn, { color: c.muted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── payment filters ── */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          style={s.filtersScroll} contentContainerStyle={s.filtersRow}>
          {(['todos', 'al_dia', 'pendiente', 'adeuda'] as FilterPayment[]).map(f => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilterPayment(f)}
              style={[
                s.chip,
                {
                  backgroundColor: filterPayment === f ? c.accent : c.mutedLight,
                  borderColor: filterPayment === f ? c.accent : c.border,
                },
              ]}>
              <Text style={[s.chipText, { color: filterPayment === f ? '#fff' : c.muted }]}>
                {f === 'todos' ? 'Todos' : PAYMENT_LABELS[f]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── patient list ── */}
        {filtered.length === 0 ? (
          <View style={[s.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[s.emptyTitle, { color: c.text }]}>Sin resultados</Text>
            <Text style={[s.emptyText, { color: c.muted }]}>Intentá con otro nombre o filtro</Text>
          </View>
        ) : (
          <View style={s.list}>
            {filtered.map(patient => {
              const pay = getPaymentColor(patient.paymentStatus);
              const nextDate = patient.nextSession
                ? new Date(patient.nextSession).toLocaleDateString('es-AR', {
                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
                  })
                : null;

              return (
                <TouchableOpacity
                  key={patient.id}
                  style={[s.card, { backgroundColor: c.card, borderColor: c.border }]}
                  onPress={() => router.push(`/paciente/${patient.id}` as any)}
                  activeOpacity={0.7}>
                  <View style={[s.avatar, { backgroundColor: patient.avatarColor + '22' }]}>
                    <Text style={[s.avatarText, { color: patient.avatarColor }]}>
                      {patient.initials}
                    </Text>
                  </View>

                  <View style={s.cardInfo}>
                    <Text style={[s.patientName, { color: c.text }]}>{patient.name}</Text>
                    <Text style={[s.patientPhone, { color: c.muted }]}>{patient.phone || '—'}</Text>
                    {nextDate ? (
                      <Text style={[s.nextSession, { color: c.accent }]}>Próx: {nextDate}</Text>
                    ) : (
                      <Text style={[s.nextSession, { color: c.muted }]}>Sin próxima sesión</Text>
                    )}
                  </View>

                  <View style={s.cardRight}>
                    <View style={[s.payBadge, { backgroundColor: pay.bg }]}>
                      <Text style={[s.payText, { color: pay.text }]}>
                        {PAYMENT_LABELS[patient.paymentStatus]}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => confirmDelete(patient.id, patient.name)}
                      style={[s.deleteBtn, { backgroundColor: c.dangerLight }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialIcons name="delete-outline" size={15} color={c.danger} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      <PatientModal visible={showNewPatient} onClose={() => setShowNewPatient(false)} />
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
  addBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
    shadowColor: '#BB8588', shadowOpacity: 0.25, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', borderRadius: 13,
    borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11,
    marginBottom: 12, gap: 8,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: '500' },
  clearBtn: { fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },
  filtersScroll: { marginBottom: 20 },
  filtersRow: { gap: 8, paddingRight: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '600' },
  list: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  cardInfo: { flex: 1, gap: 3 },
  patientName: { fontSize: 15, fontWeight: '700' },
  patientPhone: { fontSize: 12, fontWeight: '500' },
  nextSession: { fontSize: 12, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  payBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10, minWidth: 64, alignItems: 'center' },
  payText: { fontSize: 11, fontWeight: '700' },
  deleteBtn: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  emptyCard: { borderRadius: 16, padding: 32, borderWidth: 1, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 14 },
});
