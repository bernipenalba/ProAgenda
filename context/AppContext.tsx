import React, { createContext, useContext, useState, ReactNode } from 'react';
import {
  PATIENTS,
  APPOINTMENTS,
  Patient,
  PatientNote,
  Appointment,
  Session,
  SessionStatus,
  AppointmentModality,
  PaymentStatus,
  PaymentMethod,
} from '@/constants/MockData';
// PatientStatus removed — patients no longer have an activo/inactivo status
import { getTodayISO, buildDateISO } from '@/constants/dateUtils';

// ── input types ────────────────────────────────────────────────────────────────

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

// ── helpers ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#D8A48F', '#A3A380', '#C4A84A', '#BB8588',
  '#9E8EA8', '#8E9E8A', '#C4847A', '#88A0A8',
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * ADEUDA: has unpaid non-cancelled sessions with date strictly before today.
 * PENDIENTE: has unpaid non-cancelled sessions but all are today or future.
 * AL_DÍA: all non-cancelled sessions are paid (or none exist).
 *
 * Uses date comparison, not the stored status field, so that sessions created
 * as 'pendiente' in the future but whose date has now passed are correctly
 * flagged as debt without needing a status update in the data.
 */
function computePaymentStatus(sessions: Session[]): PaymentStatus {
  const today = getTodayISO();
  const relevant = sessions.filter(s => s.status !== 'cancelada' && !s.paid);
  if (relevant.length === 0) return 'al_dia';
  return relevant.some(s => s.date < today) ? 'adeuda' : 'pendiente';
}

function getNowISO(): string {
  const now = new Date();
  return buildDateISO(now.getFullYear(), now.getMonth() + 1, now.getDate()) +
    'T' + String(now.getHours()).padStart(2, '0') +
    ':' + String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
}

function computeNextSession(patientId: string, appts: Appointment[]): string | null {
  const today = getTodayISO();
  const upcoming = appts
    .filter(a => a.patientId === patientId && a.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  return upcoming.length > 0 ? `${upcoming[0].date}T${upcoming[0].time}:00` : null;
}

// ── context type ───────────────────────────────────────────────────────────────

interface AppContextType {
  patients: Patient[];
  appointments: Appointment[];
  // patients
  addPatient: (data: NewPatientInput) => void;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  deletePatient: (id: string) => void;
  // notes
  addNote: (patientId: string, content: string) => void;
  updateNote: (patientId: string, noteId: string, content: string) => void;
  deleteNote: (patientId: string, noteId: string) => void;
  // appointments
  addAppointment: (data: NewAppointmentInput) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  cancelAppointment: (id: string) => void;
  markAppointmentPaid: (id: string, method: PaymentMethod) => void;
  unmarkAppointmentPaid: (id: string) => void;
  // sessions — markSessionsPaid handles any number of sessions atomically
  markSessionsPaid: (patientId: string, sessionIds: string[], method: PaymentMethod) => void;
  markSessionPaid: (patientId: string, sessionId: string, method: PaymentMethod) => void;
  unmarkSessionPaid: (patientId: string, sessionId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

// ── provider ──────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: recompute paymentStatus and nextSession from real data on every fresh load.
  const [patients, setPatients] = useState<Patient[]>(() =>
    PATIENTS.map(p => ({
      ...p,
      paymentStatus: computePaymentStatus(p.sessions),
      nextSession: computeNextSession(p.id, APPOINTMENTS),
    }))
  );
  const [appointments, setAppointments] = useState<Appointment[]>(APPOINTMENTS);

  // ── patient operations ──

  function addPatient(data: NewPatientInput) {
    const colorIdx = patients.length % AVATAR_COLORS.length;
    const newPatient: Patient = {
      id: Date.now().toString(),
      name: data.name.trim(),
      initials: getInitials(data.name),
      age: parseInt(data.age) || 0,
      phone: data.phone.trim(),
      email: data.email.trim(),
      observations: data.observations.trim(),
      notes: [],
      paymentStatus: 'al_dia',
      nextSession: null,
      avatarColor: AVATAR_COLORS[colorIdx],
      sessions: [],
    };
    setPatients(prev => [...prev, newPatient]);
  }

  function updatePatient(id: string, data: Partial<Patient>) {
    setPatients(prev => prev.map(p => {
      if (p.id !== id) return p;
      const updated = { ...p, ...data };
      if (data.name) updated.initials = getInitials(data.name);
      return updated;
    }));
    if (data.name) {
      const initials = getInitials(data.name);
      setAppointments(prev => prev.map(a =>
        a.patientId === id
          ? { ...a, patientName: data.name!, patientInitials: initials }
          : a
      ));
    }
  }

  function deletePatient(id: string) {
    setPatients(prev => prev.filter(p => p.id !== id));
    setAppointments(prev => prev.filter(a => a.patientId !== id));
  }

  // ── note operations ──

  function addNote(patientId: string, content: string) {
    const now = new Date();
    const createdAt =
      buildDateISO(now.getFullYear(), now.getMonth() + 1, now.getDate()) +
      'T' + String(now.getHours()).padStart(2, '0') +
      ':' + String(now.getMinutes()).padStart(2, '0') + ':00';
    const newNote: PatientNote = { id: 'note_' + Date.now().toString(), content, createdAt };
    setPatients(prev => prev.map(p =>
      p.id === patientId ? { ...p, notes: [newNote, ...p.notes] } : p
    ));
  }

  function updateNote(patientId: string, noteId: string, content: string) {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return { ...p, notes: p.notes.map(n => n.id === noteId ? { ...n, content } : n) };
    }));
  }

  function deleteNote(patientId: string, noteId: string) {
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      return { ...p, notes: p.notes.filter(n => n.id !== noteId) };
    }));
  }

  // ── appointment operations ──

  function addAppointment(data: NewAppointmentInput) {
    const patient = patients.find(p => p.id === data.patientId);
    if (!patient) return;

    const today = getTodayISO();
    const ts = Date.now().toString();
    const apptId = 'a' + ts;
    const sessionId = 'ses_' + ts;

    const sessionStatus: SessionStatus = data.date < today ? 'realizada' : 'pendiente';

    const newSession: Session = {
      id: sessionId,
      date: data.date,
      status: sessionStatus,
      amount: parseInt(data.amount) || 0,
      paid: false,
      appointmentId: apptId,
    };

    const newAppt: Appointment = {
      id: apptId,
      patientId: patient.id,
      patientName: patient.name,
      patientInitials: patient.initials,
      patientAvatarColor: patient.avatarColor,
      date: data.date,
      time: data.time,
      duration: parseInt(data.duration) || 50,
      modality: data.modality,
      amount: parseInt(data.amount) || 0,
      paid: false,
      sessionId,
    };

    const updatedAppts = [...appointments, newAppt];
    setAppointments(updatedAppts);

    setPatients(prev => prev.map(p => {
      if (p.id !== patient.id) return p;
      const sessions = [...p.sessions, newSession];
      return {
        ...p,
        sessions,
        paymentStatus: computePaymentStatus(sessions),
        nextSession: computeNextSession(p.id, updatedAppts),
      };
    }));
  }

  function updateAppointment(id: string, data: Partial<Appointment>) {
    const appt = appointments.find(a => a.id === id);
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));

    if (appt?.sessionId && (data.amount !== undefined || data.date !== undefined)) {
      setPatients(prev => prev.map(p => {
        if (p.id !== appt.patientId) return p;
        const sessions = p.sessions.map(s => {
          if (s.id !== appt.sessionId) return s;
          const updates: Partial<Session> = {};
          if (data.amount !== undefined) updates.amount = data.amount;
          if (data.date !== undefined) updates.date = data.date;
          return { ...s, ...updates };
        });
        return { ...p, sessions };
      }));
    }
  }

  function cancelAppointment(id: string) {
    const appt = appointments.find(a => a.id === id);
    const updatedAppts = appointments.filter(a => a.id !== id);
    setAppointments(updatedAppts);

    if (appt) {
      setPatients(prev => prev.map(p => {
        if (p.id !== appt.patientId) return p;
        const sessions = appt.sessionId
          ? p.sessions.map(s =>
              s.id === appt.sessionId ? { ...s, status: 'cancelada' as SessionStatus } : s
            )
          : p.sessions;
        return {
          ...p,
          sessions,
          paymentStatus: computePaymentStatus(sessions),
          nextSession: computeNextSession(p.id, updatedAppts),
        };
      }));
    }
  }

  function markAppointmentPaid(id: string, method: PaymentMethod) {
    const appt = appointments.find(a => a.id === id);
    const paidAt = getNowISO();
    setAppointments(prev => prev.map(a =>
      a.id === id ? { ...a, paid: true, paymentMethod: method } : a
    ));

    if (appt?.sessionId) {
      setPatients(prev => prev.map(p => {
        if (p.id !== appt.patientId) return p;
        const sessions = p.sessions.map(s =>
          s.id === appt.sessionId
            ? { ...s, paid: true, paymentMethod: method, status: 'realizada' as SessionStatus, paidAt }
            : s
        );
        return { ...p, sessions, paymentStatus: computePaymentStatus(sessions) };
      }));
    }
  }

  function unmarkAppointmentPaid(id: string) {
    const appt = appointments.find(a => a.id === id);
    setAppointments(prev => prev.map(a =>
      a.id === id ? { ...a, paid: false, paymentMethod: undefined } : a
    ));

    if (appt?.sessionId) {
      setPatients(prev => prev.map(p => {
        if (p.id !== appt.patientId) return p;
        const sessions = p.sessions.map(s =>
          s.id === appt.sessionId ? { ...s, paid: false, paymentMethod: undefined } : s
        );
        return { ...p, sessions, paymentStatus: computePaymentStatus(sessions) };
      }));
    }
  }

  // Marks any number of sessions paid in a single atomic state update.
  // This is the preferred function for multi-select payment from PaymentModal.
  function markSessionsPaid(patientId: string, sessionIds: string[], method: PaymentMethod) {
    if (sessionIds.length === 0) return;
    const patient = patients.find(p => p.id === patientId);
    const paidAt = getNowISO();
    const idSet = new Set(sessionIds);

    // Collect appointmentIds to sync, reading from the current (pre-update) snapshot.
    const apptIds = new Set<string>();
    sessionIds.forEach(sid => {
      const s = patient?.sessions.find(s => s.id === sid);
      if (s?.appointmentId) apptIds.add(s.appointmentId);
    });

    // Single atomic update: all selected sessions marked paid at once.
    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      const sessions = p.sessions.map(s =>
        idSet.has(s.id)
          ? { ...s, paid: true, paymentMethod: method, status: 'realizada' as SessionStatus, paidAt }
          : s
      );
      return { ...p, sessions, paymentStatus: computePaymentStatus(sessions) };
    }));

    // Single atomic update for linked appointments.
    if (apptIds.size > 0) {
      setAppointments(prev => prev.map(a =>
        apptIds.has(a.id) ? { ...a, paid: true, paymentMethod: method } : a
      ));
    }
  }

  function markSessionPaid(patientId: string, sessionId: string, method: PaymentMethod) {
    markSessionsPaid(patientId, [sessionId], method);
  }

  function unmarkSessionPaid(patientId: string, sessionId: string) {
    const patient = patients.find(p => p.id === patientId);
    const session = patient?.sessions.find(s => s.id === sessionId);

    setPatients(prev => prev.map(p => {
      if (p.id !== patientId) return p;
      const sessions = p.sessions.map(s =>
        s.id === sessionId ? { ...s, paid: false, paymentMethod: undefined } : s
      );
      return { ...p, sessions, paymentStatus: computePaymentStatus(sessions) };
    }));

    if (session?.appointmentId) {
      setAppointments(prev => prev.map(a =>
        a.id === session.appointmentId ? { ...a, paid: false, paymentMethod: undefined } : a
      ));
    }
  }

  return (
    <AppContext.Provider value={{
      patients,
      appointments,
      addPatient,
      updatePatient,
      deletePatient,
      addNote,
      updateNote,
      deleteNote,
      addAppointment,
      updateAppointment,
      cancelAppointment,
      markAppointmentPaid,
      unmarkAppointmentPaid,
      markSessionsPaid,
      markSessionPaid,
      unmarkSessionPaid,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
