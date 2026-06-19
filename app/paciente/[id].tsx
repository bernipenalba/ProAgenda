import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useApp } from '@/context/AppContext';
import { Session, SessionStatus, PaymentMethod, PatientNote, Appointment } from '@/constants/MockData';
import { PatientModal } from '@/components/modals/PatientModal';
import { AppointmentModal } from '@/components/modals/AppointmentModal';
import { PaymentModal } from '@/components/modals/PaymentModal';
import { ApptDetailModal } from '@/components/modals/ApptDetailModal';
import { parseLocalDate, getTodayISO, formatTodayCompact } from '@/constants/dateUtils';
import { useAuth } from '@/context/AuthContext';

// ── helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number): string { return '$' + n.toLocaleString('es-AR'); }
function formatDate(d: string): string {
  return parseLocalDate(d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
}

const NOTE_MONTHS = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const SESSION_LABEL: Record<SessionStatus, string> = {
  realizada: 'Realizada', cancelada: 'Cancelada', pendiente: 'Pendiente',
};

// ── note card ─────────────────────────────────────────────────────────────────

function NoteCard({
  note, c, onEdit, onDelete,
}: {
  note: PatientNote;
  c: typeof Colors['light'];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const d = parseLocalDate(note.createdAt.slice(0, 10));
  const time = note.createdAt.slice(11, 16);
  const dateLabel = `${d.getDate()} ${NOTE_MONTHS[d.getMonth()]} · ${time} hs`;

  return (
    <View style={[nc.card, { backgroundColor: c.background, borderColor: c.border }]}>
      <Text style={[nc.content, { color: c.text }]}>{note.content}</Text>
      <View style={nc.footer}>
        <Text style={[nc.date, { color: c.muted }]}>{dateLabel}</Text>
        <View style={nc.actions}>
          <TouchableOpacity onPress={onEdit} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={[nc.actionBtn, { color: c.accent }]}>Editar</Text>
          </TouchableOpacity>
          <Text style={{ color: c.border, fontSize: 12 }}>·</Text>
          <TouchableOpacity onPress={onDelete} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={[nc.actionBtn, { color: c.danger }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const nc = StyleSheet.create({
  card: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  content: { fontSize: 14, lineHeight: 21, marginBottom: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 11, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  actionBtn: { fontSize: 12, fontWeight: '700' },
});

// ── session row ───────────────────────────────────────────────────────────────

function SessionRow({
  session, c, onMarkPaid, onPress,
}: {
  session: Session;
  c: typeof Colors['light'];
  onMarkPaid: (method: PaymentMethod) => void;
  onPress?: () => void;
}) {
  const statusColor =
    session.status === 'realizada' ? c.success :
    session.status === 'cancelada' ? c.muted : c.warning;
  const statusBg =
    session.status === 'realizada' ? c.successLight :
    session.status === 'cancelada' ? c.mutedLight : c.warningLight;

  return (
    <TouchableOpacity
      style={[sr.row, { borderBottomColor: c.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}>
      <View style={[sr.dot, { backgroundColor: statusColor }]} />
      <View style={sr.info}>
        <Text style={[sr.date, { color: c.text }]}>{formatDate(session.date)}</Text>
        <View style={sr.meta}>
          <View style={[sr.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[sr.statusText, { color: statusColor }]}>{SESSION_LABEL[session.status]}</Text>
          </View>
          {session.status !== 'cancelada' && (
            <View style={[sr.paidBadge, {
              backgroundColor: session.paid ? c.successLight : c.dangerLight,
            }]}>
              <Text style={[sr.paidText, { color: session.paid ? c.success : c.danger }]}>
                {session.paid ? 'Cobrada' : 'Sin cobrar'}
              </Text>
            </View>
          )}
          {session.paid && session.paymentMethod && (
            <View style={[sr.methodBadge, { backgroundColor: c.mutedLight }]}>
              <Text style={[sr.methodText, { color: c.muted }]}>
                {session.paymentMethod === 'efectivo' ? 'Efectivo' : 'Transf.'}
              </Text>
            </View>
          )}
        </View>
      </View>
      {session.status !== 'cancelada' && (
        <View style={sr.right}>
          <Text style={[sr.amount, { color: session.paid ? c.text : c.danger }]}>
            {formatCurrency(session.amount)}
          </Text>
          {onPress ? (
            <Text style={[sr.chevron, { color: c.muted }]}>›</Text>
          ) : (
            !session.paid && (
              <TouchableOpacity
                onPress={() => Alert.alert(
                  'Método de pago',
                  '¿Cómo se realizó el pago?',
                  [
                    { text: 'Transferencia', onPress: () => onMarkPaid('transferencia') },
                    { text: 'Efectivo', onPress: () => onMarkPaid('efectivo') },
                    { text: 'Cancelar', style: 'cancel' },
                  ]
                )}
                style={[sr.markBtn, { backgroundColor: c.successLight }]}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={[sr.markBtnText, { color: c.success }]}>Cobrar</Text>
              </TouchableOpacity>
            )
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const sr = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  info: { flex: 1, gap: 5 },
  date: { fontSize: 14, fontWeight: '600' },
  meta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  paidBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  paidText: { fontSize: 11, fontWeight: '700' },
  right: { alignItems: 'flex-end', gap: 6 },
  amount: { fontSize: 14, fontWeight: '800' },
  markBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  markBtnText: { fontSize: 12, fontWeight: '700' },
  chevron: { fontSize: 22, fontWeight: '600' },
  methodBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  methodText: { fontSize: 11, fontWeight: '600' },
});

// ── info row ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, c }: { label: string; value: string; c: typeof Colors['light'] }) {
  return (
    <View style={[ir.row, { borderBottomColor: c.border }]}>
      <Text style={[ir.label, { color: c.muted }]}>{label}</Text>
      <Text style={[ir.value, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const ir = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
});

// ── main screen ───────────────────────────────────────────────────────────────

type TabKey = 'sesiones' | 'info' | 'notas';

export default function PatientProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const c = Colors[colorScheme];
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { patients, appointments, deletePatient, addNote, updateNote, deleteNote, markSessionPaid, unmarkSessionPaid, cancelAppointment, markAppointmentPaid, unmarkAppointmentPaid } = useApp();

  useEffect(() => {
    if (authLoading) return;
    if (!session) router.replace('/login' as any);
  }, [session, authLoading]);

  const scrollRef = useRef<ScrollView>(null);
  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  const patient = patients.find(p => p.id === id);
  const [activeTab, setActiveTab] = useState<TabKey>('sesiones');
  const [showEditPatient, setShowEditPatient] = useState(false);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  // notes state
  const [addingNote, setAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [detailSession, setDetailSession] = useState<Session | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  if (!patient) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
        <View style={s.notFound}>
          <Text style={[s.notFoundText, { color: c.muted }]}>Paciente no encontrado</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[s.backLink, { color: c.accent }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const todayStr = getTodayISO();

  // Appointment object that corresponds to the next session shown in the card.
  // Used to open AppointmentModal in edit mode (pre-filled) instead of create mode.
  const nextAppt = patient.nextSession
    ? appointments.find(
        a => a.patientId === patient.id && `${a.date}T${a.time}:00` === patient.nextSession
      ) ?? null
    : null;

  const totalPaid = patient.sessions.filter(s => s.paid).reduce((sum, s) => sum + s.amount, 0);
  const totalOwed = patient.sessions.filter(s => s.status !== 'cancelada' && !s.paid && s.date <= todayStr).reduce((sum, s) => sum + s.amount, 0);
  const completedSessions = patient.sessions.filter(s => s.status === 'realizada').length;

  const payStatusColor = patient.paymentStatus === 'al_dia' ? c.success : patient.paymentStatus === 'pendiente' ? c.warning : c.danger;
  const payStatusBg = patient.paymentStatus === 'al_dia' ? c.successLight : patient.paymentStatus === 'pendiente' ? c.warningLight : c.dangerLight;
  const payStatusLabel = patient.paymentStatus === 'al_dia' ? 'Al día' : patient.paymentStatus === 'pendiente' ? 'Pago pendiente' : 'Adeuda';

  function handleDelete() {
    Alert.alert(
      'Eliminar paciente',
      `¿Seguro que querés eliminar a ${patient!.name}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => { deletePatient(patient!.id); router.back(); } },
      ]
    );
  }

  function handleAddNote() {
    if (!newNoteContent.trim()) return;
    addNote(patient!.id, newNoteContent.trim());
    setAddingNote(false);
    setNewNoteContent('');
  }

  function handleUpdateNote(noteId: string) {
    if (!editContent.trim()) return;
    updateNote(patient!.id, noteId, editContent.trim());
    setEditingNoteId(null);
    setEditContent('');
  }

  function handleDeleteNote(noteId: string) {
    Alert.alert('Eliminar nota', '¿Seguro que querés eliminar esta nota?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteNote(patient!.id, noteId) },
    ]);
  }

  function handleSessionPress(session: Session) {
    setDetailSession(session);
    if (session.appointmentId) {
      const appt = appointments.find(a => a.id === session.appointmentId);
      if (appt) { setDetailAppt(appt); return; }
    }
    // Synthetic appointment for sessions not linked to a calendar entry
    setDetailAppt({
      id: session.id,
      patientId: patient!.id,
      patientName: patient!.name,
      patientInitials: patient!.initials,
      patientAvatarColor: patient!.avatarColor,
      date: session.date,
      time: '',
      duration: 0,
      modality: 'presencial',
      amount: session.amount,
      paid: session.paid,
      paymentMethod: session.paymentMethod,
    });
  }

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

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'sesiones', label: 'Sesiones' },
    { key: 'info', label: 'Información' },
    { key: 'notas', label: `Notas${patient.notes.length > 0 ? ` (${patient.notes.length})` : ''}` },
  ];

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: c.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* ── top bar ── */}
      <View style={[s.topBar, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Text style={[s.backArrow, { color: c.accent }]}>‹</Text>
          <Text style={[s.backText, { color: c.accent }]}>Pacientes</Text>
        </TouchableOpacity>
        <View style={s.topBarRight}>
          <TouchableOpacity onPress={() => setShowEditPatient(true)} style={[s.topAction, { backgroundColor: c.accentLight }]}>
            <Text style={[s.topActionText, { color: c.accent }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={[s.topAction, { backgroundColor: c.dangerLight }]}>
            <Text style={[s.topActionText, { color: c.danger }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── date reference ── */}
        <Text style={[s.dateLabel, { color: c.muted }]}>{formatTodayCompact()}</Text>

        {/* ── patient header ── */}
        <View style={s.profileHeader}>
          <View style={[s.avatar, { backgroundColor: patient.avatarColor + '22' }]}>
            <Text style={[s.avatarText, { color: patient.avatarColor }]}>{patient.initials}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={[s.patientName, { color: c.text }]}>{patient.name}</Text>
            <Text style={[s.patientAge, { color: c.muted }]}>{patient.age} años</Text>
            <View style={[s.payBadge, { backgroundColor: payStatusBg }]}>
              <Text style={[s.payBadgeText, { color: payStatusColor }]}>{payStatusLabel}</Text>
            </View>
          </View>
        </View>

        {/* ── stats ── */}
        <View style={s.statsRow}>
          <View style={[s.statCard, { backgroundColor: c.accentLight }]}>
            <Text style={[s.statValue, { color: c.accent }]}>{completedSessions}</Text>
            <Text style={[s.statLabel, { color: c.accent + 'AA' }]}>Sesiones</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: c.successLight }]}>
            <Text style={[s.statValue, { color: c.success }]}>{formatCurrency(totalPaid)}</Text>
            <Text style={[s.statLabel, { color: c.success + 'AA' }]}>Cobrado</Text>
          </View>
          {totalOwed > 0 && (
            <View style={[s.statCard, { backgroundColor: c.dangerLight }]}>
              <Text style={[s.statValue, { color: c.danger }]}>{formatCurrency(totalOwed)}</Text>
              <Text style={[s.statLabel, { color: c.danger + 'AA' }]}>Pendiente</Text>
            </View>
          )}
        </View>

        {/* ── next session / cta ── */}
        {patient.nextSession ? (
          <View style={[s.nextCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={s.nextCardLeft}>
              <Text style={[s.nextCardLabel, { color: c.muted }]}>Próxima sesión</Text>
              <Text style={[s.nextCardDate, { color: c.text }]}>
                {new Date(patient.nextSession).toLocaleDateString('es-AR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </Text>
              <Text style={[s.nextCardTime, { color: c.accent }]}>
                {new Date(patient.nextSession).toLocaleTimeString('es-AR', {
                  hour: '2-digit', minute: '2-digit', hour12: false,
                })} hs
              </Text>
            </View>
            <View style={s.nextCardActions}>
              <TouchableOpacity
                style={[s.scheduleBtn, { backgroundColor: c.accent }]}
                onPress={() => nextAppt ? setEditingAppt(nextAppt) : setShowNewAppt(true)}
                activeOpacity={0.85}>
                <Text style={s.scheduleBtnText}>Reagendar</Text>
              </TouchableOpacity>
              {totalOwed > 0 && (
                <TouchableOpacity style={[s.scheduleBtn, { backgroundColor: c.success }]} onPress={() => setShowPayment(true)} activeOpacity={0.85}>
                  <Text style={s.scheduleBtnText}>Cobrar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={s.ctaRow}>
            <TouchableOpacity style={[s.scheduleFullBtn, { backgroundColor: c.accent }]} onPress={() => setShowNewAppt(true)} activeOpacity={0.85}>
              <Text style={s.scheduleBtnText}>+ Agendar próximo turno</Text>
            </TouchableOpacity>
            {totalOwed > 0 && (
              <TouchableOpacity style={[s.scheduleFullBtn, { backgroundColor: c.success, flex: 0.45 }]} onPress={() => setShowPayment(true)} activeOpacity={0.85}>
                <Text style={s.scheduleBtnText}>Registrar cobro</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── tabs ── */}
        <View style={[s.tabs, { borderBottomColor: c.border }]}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[s.tab, activeTab === tab.key && [s.tabActive, { borderBottomColor: c.accent }]]}>
              <Text style={[s.tabText, { color: activeTab === tab.key ? c.accent : c.muted }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── sesiones tab ── */}
        {activeTab === 'sesiones' && (
          <View style={[s.tabContent, { backgroundColor: c.card, borderColor: c.border }]}>
            {patient.sessions.length === 0 ? (
              <Text style={[s.emptyText, { color: c.muted }]}>Sin sesiones registradas</Text>
            ) : (
              [...patient.sessions]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(session => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    c={c}
                    onMarkPaid={(method) => markSessionPaid(patient.id, session.id, method)}
                    onPress={session.status !== 'cancelada' ? () => handleSessionPress(session) : undefined}
                  />
                ))
            )}
          </View>
        )}

        {/* ── info tab ── */}
        {activeTab === 'info' && (
          <View style={[s.tabContent, { backgroundColor: c.card, borderColor: c.border }]}>
            <InfoRow label="Teléfono" value={patient.phone || '—'} c={c} />
            <InfoRow label="Email" value={patient.email || '—'} c={c} />
            <InfoRow label="Edad" value={`${patient.age} años`} c={c} />
            {patient.observations.length > 0 && (
              <View style={[s.obsWrap, { borderBottomColor: c.border }]}>
                <Text style={[s.obsLabel, { color: c.muted }]}>Observaciones</Text>
                <Text style={[s.obsText, { color: c.text }]}>{patient.observations}</Text>
              </View>
            )}
          </View>
        )}

        {/* ── notas tab ── */}
        {activeTab === 'notas' && (
          <View style={[s.tabContent, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={nt.header}>
              <Text style={[nt.title, { color: c.muted }]}>NOTAS PRIVADAS</Text>
              {!addingNote && (
                <TouchableOpacity
                  onPress={() => { setAddingNote(true); setEditingNoteId(null); }}
                  style={[nt.addBtn, { backgroundColor: c.accentLight }]}>
                  <Text style={[nt.addBtnText, { color: c.accent }]}>+ Nueva nota</Text>
                </TouchableOpacity>
              )}
            </View>

            {addingNote && (
              <View style={[nt.editor, { borderColor: c.accent }]}>
                <TextInput
                  style={[nt.editorInput, { color: c.text }]}
                  multiline
                  value={newNoteContent}
                  onChangeText={setNewNoteContent}
                  placeholder="Escribí tu observación..."
                  placeholderTextColor={c.muted + '88'}
                  textAlignVertical="top"
                  autoFocus
                />
                <View style={nt.editorActions}>
                  <TouchableOpacity onPress={() => { setAddingNote(false); setNewNoteContent(''); }} style={[nt.editorBtn, { backgroundColor: c.mutedLight }]}>
                    <Text style={[nt.editorBtnText, { color: c.muted }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddNote} style={[nt.editorBtn, { backgroundColor: c.accent }]}>
                    <Text style={[nt.editorBtnText, { color: '#fff' }]}>Guardar nota</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {patient.notes.length === 0 && !addingNote ? (
              <View style={[nt.empty, { backgroundColor: c.mutedLight }]}>
                <Text style={[nt.emptyText, { color: c.muted }]}>
                  Sin notas. Tocá + Nueva nota para agregar.
                </Text>
              </View>
            ) : (
              patient.notes.map(note =>
                editingNoteId === note.id ? (
                  <View key={note.id} style={[nt.editor, { borderColor: c.accent }]}>
                    <TextInput
                      style={[nt.editorInput, { color: c.text }]}
                      multiline
                      value={editContent}
                      onChangeText={setEditContent}
                      textAlignVertical="top"
                      autoFocus
                    />
                    <View style={nt.editorActions}>
                      <TouchableOpacity onPress={() => setEditingNoteId(null)} style={[nt.editorBtn, { backgroundColor: c.mutedLight }]}>
                        <Text style={[nt.editorBtnText, { color: c.muted }]}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleUpdateNote(note.id)} style={[nt.editorBtn, { backgroundColor: c.accent }]}>
                        <Text style={[nt.editorBtnText, { color: '#fff' }]}>Guardar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <NoteCard
                    key={note.id}
                    note={note}
                    c={c}
                    onEdit={() => { setEditingNoteId(note.id); setEditContent(note.content); setAddingNote(false); }}
                    onDelete={() => handleDeleteNote(note.id)}
                  />
                )
              )
            )}

            <View style={[nt.disclaimer, { backgroundColor: c.warningLight }]}>
              <Text style={[nt.disclaimerText, { color: c.warning }]}>Solo visible para vos</Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <PatientModal visible={showEditPatient} patient={patient} onClose={() => setShowEditPatient(false)} />
      <AppointmentModal visible={showNewAppt} defaultPatientId={patient.id} onClose={() => setShowNewAppt(false)} />
      <AppointmentModal
        visible={!!editingAppt}
        appointment={editingAppt ?? undefined}
        onClose={() => setEditingAppt(null)}
      />
      <PaymentModal visible={showPayment} patientId={patient.id} onClose={() => setShowPayment(false)} />
      {detailAppt && detailSession && (
        <ApptDetailModal
          appt={detailAppt}
          colors={c}
          onClose={() => { setDetailAppt(null); setDetailSession(null); }}
          onEdit={detailSession.appointmentId
            ? () => { setEditingAppt(detailAppt); setDetailAppt(null); setDetailSession(null); }
            : undefined}
          onCancel={detailSession.appointmentId
            ? () => handleCancelAppt(detailAppt.id)
            : undefined}
          onMarkPaid={(method) => { markSessionPaid(patient.id, detailSession.id, method); setDetailAppt(null); setDetailSession(null); }}
          onUnmarkPaid={() => { unmarkSessionPaid(patient.id, detailSession.id); setDetailAppt(null); setDetailSession(null); }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 40 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backArrow: { fontSize: 24, fontWeight: '400', lineHeight: 24 },
  backText: { fontSize: 16, fontWeight: '600' },
  topBarRight: { flexDirection: 'row', gap: 8 },
  topAction: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  topActionText: { fontSize: 13, fontWeight: '700' },
  dateLabel: { fontSize: 13, fontWeight: '500', marginBottom: 10, paddingTop: 8 },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontWeight: '900' },
  profileInfo: { flex: 1, gap: 4 },
  patientName: { fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  patientAge: { fontSize: 14 },
  payBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 2 },
  payBadgeText: { fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 12, padding: 12, gap: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  statValue: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, fontWeight: '600' },
  nextCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  nextCardLeft: { gap: 2, flex: 1 },
  nextCardLabel: { fontSize: 11, fontWeight: '600' },
  nextCardDate: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  nextCardTime: { fontSize: 15, fontWeight: '800' },
  nextCardActions: { gap: 8 },
  ctaRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  scheduleBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, shadowColor: '#BB8588', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  scheduleFullBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', shadowColor: '#BB8588', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  scheduleBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 0 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontSize: 13, fontWeight: '700' },
  tabContent: { borderRadius: 14, borderTopLeftRadius: 0, borderTopRightRadius: 0, padding: 16, borderWidth: 1, borderTopWidth: 0, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  obsWrap: { paddingVertical: 12, borderBottomWidth: 1, gap: 4 },
  obsLabel: { fontSize: 12, fontWeight: '600' },
  obsText: { fontSize: 14, lineHeight: 20 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16 },
  backLink: { fontSize: 16, fontWeight: '700' },
});

const nt = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  addBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  addBtnText: { fontSize: 13, fontWeight: '700' },
  editor: { borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 10 },
  editorInput: { fontSize: 14, lineHeight: 20, minHeight: 80, marginBottom: 10 },
  editorActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  editorBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 9 },
  editorBtnText: { fontSize: 13, fontWeight: '700' },
  empty: { borderRadius: 10, padding: 16, marginBottom: 10 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  disclaimer: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', marginTop: 4 },
  disclaimerText: { fontSize: 12, fontWeight: '600' },
});
