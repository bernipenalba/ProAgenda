import React, { createContext, useContext, ReactNode } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import {
  Patient,
  PatientNote,
  Appointment,
  Session,
  SessionStatus,
  AppointmentModality,
  PaymentStatus,
  PaymentMethod,
} from '@/constants/MockData';
import { getTodayISO } from '@/constants/dateUtils';
import { useAuth } from './AuthContext';
import {
  fetchPatients,
  fetchAppointments,
  insertPatient,
  updatePatientRow,
  deletePatientRow,
  insertNote,
  updateNoteRow,
  deleteNoteRow,
  insertAppointmentWithSession,
  updateAppointmentRow,
  cancelAppointmentRow,
  markSessionsPaidRow,
  unmarkSessionPaidRow,
  DBPatient,
  DBAppointment,
} from '@/lib/queries';
import { supabase } from '@/lib/supabase';

// ── input types ───────────────────────────────────────────────────────────────

export interface NewPatientInput {
  name: string;
  age: string;
  phone: string;
  email: string;
  observations: string;
}

export interface NewAppointmentInput {
  patientId: string;
  date: string;
  time: string;
  duration: string;
  modality: AppointmentModality;
  amount: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#D8A48F', '#A3A380', '#C4A84A', '#BB8588',
  '#9E8EA8', '#8E9E8A', '#C4847A', '#88A0A8',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function computePaymentStatus(sessions: Session[]): PaymentStatus {
  const today = getTodayISO();
  const relevant = sessions.filter(s => s.status !== 'cancelada' && !s.paid);
  if (relevant.length === 0) return 'al_dia';
  return relevant.some(s => s.date < today) ? 'adeuda' : 'pendiente';
}

function computeNextSession(patientId: string, appts: Appointment[]): string | null {
  const today = getTodayISO();
  const upcoming = appts
    .filter(a => a.patientId === patientId && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return upcoming.length > 0 ? `${upcoming[0].date}T${upcoming[0].time}:00` : null;
}

// ── DB → app type adapters ────────────────────────────────────────────────────

function dbPatientToPatient(db: DBPatient, appts: Appointment[]): Patient {
  const sessions: Session[] = (db.sessions ?? []).map(s => ({
    id: s.id,
    date: s.date,
    status: s.status,
    amount: s.amount,
    paid: s.paid,
    paymentMethod: s.payment_method ?? undefined,
    appointmentId: s.appointment_id ?? undefined,
    paidAt: s.paid_at ?? undefined,
  }));

  const notes: PatientNote[] = (db.patient_notes ?? [])
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(n => ({ id: n.id, content: n.content, createdAt: n.created_at }));

  return {
    id: db.id,
    name: db.name,
    initials: db.initials,
    age: db.age ?? 0,
    phone: db.phone ?? '',
    email: db.email ?? '',
    observations: db.observations ?? '',
    notes,
    sessions,
    paymentStatus: computePaymentStatus(sessions),
    nextSession: computeNextSession(db.id, appts),
    avatarColor: db.avatar_color,
  };
}

function dbApptToAppointment(db: DBAppointment, patients: Patient[]): Appointment {
  const patient = patients.find(p => p.id === db.patient_id);
  return {
    id: db.id,
    patientId: db.patient_id,
    patientName: patient?.name ?? '',
    patientInitials: patient?.initials ?? '',
    patientAvatarColor: patient?.avatarColor ?? '#6366F1',
    date: db.date,
    time: db.time,
    duration: db.duration,
    modality: db.modality,
    amount: db.amount,
    paid: db.paid,
    paymentMethod: db.payment_method ?? undefined,
    sessionId: db.session_id ?? undefined,
  };
}

// ── context type ──────────────────────────────────────────────────────────────

interface AppContextType {
  patients: Patient[];
  appointments: Appointment[];
  isLoading: boolean;
  addPatient: (data: NewPatientInput) => void;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  addNote: (patientId: string, content: string) => void;
  updateNote: (patientId: string, noteId: string, content: string) => void;
  deleteNote: (patientId: string, noteId: string) => void;
  addAppointment: (data: NewAppointmentInput) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  cancelAppointment: (id: string) => void;
  markAppointmentPaid: (id: string, method: PaymentMethod) => void;
  unmarkAppointmentPaid: (id: string) => void;
  markSessionsPaid: (patientId: string, sessionIds: string[], method: PaymentMethod) => void;
  markSessionPaid: (patientId: string, sessionId: string, method: PaymentMethod) => void;
  unmarkSessionPaid: (patientId: string, sessionId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ── provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: dbPatients = [], isLoading: loadingPatients } = useQuery({
    queryKey: ['patients', user?.id],
    queryFn: fetchPatients,
    enabled: !!user,
  });

  const { data: dbAppointments = [], isLoading: loadingAppts } = useQuery({
    queryKey: ['appointments', user?.id],
    queryFn: fetchAppointments,
    enabled: !!user,
  });

  // Build app-layer objects from DB rows (two-pass to resolve cross-references)
  const rawPatients: Patient[] = dbPatients.map(p => dbPatientToPatient(p, []));
  const appointments: Appointment[] = dbAppointments.map(a => dbApptToAppointment(a, rawPatients));
  const patients: Patient[] = dbPatients.map(p => dbPatientToPatient(p, appointments));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['patients', user?.id] });
    qc.invalidateQueries({ queryKey: ['appointments', user?.id] });
  };

  // ── patient mutations ──

  const addPatientMut = useMutation({
    mutationFn: (data: NewPatientInput) => {
      const age = parseInt(data.age, 10);
      if (isNaN(age) || age < 0 || age > 150) throw new Error('Edad inválida');
      const colorIdx = dbPatients.length % AVATAR_COLORS.length;
      return insertPatient(user!.id, {
        name: data.name.trim(),
        initials: getInitials(data.name),
        age,
        phone: data.phone.trim(),
        email: data.email.trim(),
        observations: data.observations.trim(),
        avatar_color: AVATAR_COLORS[colorIdx],
      });
    },
    onSuccess: invalidate,
  });

  const updatePatientMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Patient> }) => {
      const fields: Parameters<typeof updatePatientRow>[1] = {};
      if (data.name !== undefined) { fields.name = data.name; fields.initials = getInitials(data.name); }
      if (data.age !== undefined) fields.age = data.age;
      if (data.phone !== undefined) fields.phone = data.phone;
      if (data.email !== undefined) fields.email = data.email;
      if (data.observations !== undefined) fields.observations = data.observations;
      return updatePatientRow(id, fields);
    },
    onSuccess: invalidate,
  });

  const deletePatientMut = useMutation({
    mutationFn: deletePatientRow,
    onSuccess: invalidate,
  });

  // ── note mutations ──

  const addNoteMut = useMutation({
    mutationFn: ({ patientId, content }: { patientId: string; content: string }) =>
      insertNote(user!.id, patientId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients', user?.id] }),
  });

  const updateNoteMut = useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      updateNoteRow(noteId, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients', user?.id] }),
  });

  const deleteNoteMut = useMutation({
    mutationFn: deleteNoteRow,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['patients', user?.id] }),
  });

  // ── appointment mutations ──

  const addAppointmentMut = useMutation({
    mutationFn: (data: NewAppointmentInput) => {
      const duration = parseInt(data.duration, 10);
      if (isNaN(duration) || duration < 1 || duration > 480) throw new Error('Duración inválida');
      const amount = parseInt(data.amount, 10);
      if (isNaN(amount) || amount < 0) throw new Error('Monto inválido');
      const today = getTodayISO();
      const sessionStatus: SessionStatus = data.date < today ? 'realizada' : 'pendiente';
      return insertAppointmentWithSession(user!.id, {
        patientId: data.patientId,
        date: data.date,
        time: data.time,
        duration,
        modality: data.modality,
        amount,
        sessionStatus,
      });
    },
    onSuccess: invalidate,
  });

  const updateAppointmentMut = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Appointment> }) => {
      const appt = appointments.find(a => a.id === id);
      const apptFields: Parameters<typeof updateAppointmentRow>[1] = {};
      if (data.date !== undefined) apptFields.date = data.date;
      if (data.time !== undefined) apptFields.time = data.time;
      if (data.duration !== undefined) apptFields.duration = data.duration;
      if (data.modality !== undefined) apptFields.modality = data.modality;
      if (data.amount !== undefined) apptFields.amount = data.amount;
      await updateAppointmentRow(id, apptFields);

      if (appt?.sessionId && (data.amount !== undefined || data.date !== undefined)) {
        const sesFields: Record<string, unknown> = {};
        if (data.amount !== undefined) sesFields.amount = data.amount;
        if (data.date !== undefined) sesFields.date = data.date;
        const { error } = await supabase.from('sessions').update(sesFields).eq('id', appt.sessionId);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const cancelAppointmentMut = useMutation({
    mutationFn: (id: string) => {
      const appt = appointments.find(a => a.id === id);
      return cancelAppointmentRow(id, appt?.sessionId ?? null);
    },
    onSuccess: invalidate,
  });

  const markSessionsPaidMut = useMutation({
    mutationFn: ({ patientId, sessionIds, method }: {
      patientId: string; sessionIds: string[]; method: PaymentMethod;
    }) => {
      const patient = patients.find(p => p.id === patientId);
      const apptIds = sessionIds
        .map(sid => patient?.sessions.find(s => s.id === sid)?.appointmentId)
        .filter(Boolean) as string[];
      return markSessionsPaidRow(sessionIds, apptIds, method);
    },
    onSuccess: invalidate,
  });

  const unmarkSessionPaidMut = useMutation({
    mutationFn: ({ patientId, sessionId }: { patientId: string; sessionId: string }) => {
      const patient = patients.find(p => p.id === patientId);
      const session = patient?.sessions.find(s => s.id === sessionId);
      return unmarkSessionPaidRow(sessionId, session?.appointmentId ?? null);
    },
    onSuccess: invalidate,
  });

  const markAppointmentPaidMut = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: PaymentMethod }) => {
      const appt = appointments.find(a => a.id === id);
      await updateAppointmentRow(id, { paid: true, payment_method: method });
      if (appt?.sessionId) await markSessionsPaidRow([appt.sessionId], [], method);
    },
    onSuccess: invalidate,
  });

  const unmarkAppointmentPaidMut = useMutation({
    mutationFn: async (id: string) => {
      const appt = appointments.find(a => a.id === id);
      await updateAppointmentRow(id, { paid: false, payment_method: null });
      if (appt?.sessionId) await unmarkSessionPaidRow(appt.sessionId, null);
    },
    onSuccess: invalidate,
  });

  const value: AppContextType = {
    patients,
    appointments,
    isLoading: loadingPatients || loadingAppts,
    addPatient: (data) => addPatientMut.mutate(data),
    updatePatient: (id, data) => updatePatientMut.mutate({ id, data }),
    deletePatient: (id) => deletePatientMut.mutate(id),
    addNote: (patientId, content) => addNoteMut.mutate({ patientId, content }),
    updateNote: (_patientId, noteId, content) => updateNoteMut.mutate({ noteId, content }),
    deleteNote: (_patientId, noteId) => deleteNoteMut.mutate(noteId),
    addAppointment: (data) => addAppointmentMut.mutate(data),
    updateAppointment: (id, data) => updateAppointmentMut.mutate({ id, data }),
    cancelAppointment: (id) => cancelAppointmentMut.mutate(id),
    markAppointmentPaid: (id, method) => markAppointmentPaidMut.mutate({ id, method }),
    unmarkAppointmentPaid: (id) => unmarkAppointmentPaidMut.mutate(id),
    markSessionsPaid: (patientId, sessionIds, method) =>
      markSessionsPaidMut.mutate({ patientId, sessionIds, method }),
    markSessionPaid: (patientId, sessionId, method) =>
      markSessionsPaidMut.mutate({ patientId, sessionIds: [sessionId], method }),
    unmarkSessionPaid: (patientId, sessionId) =>
      unmarkSessionPaidMut.mutate({ patientId, sessionId }),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
