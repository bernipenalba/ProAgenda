import { supabase } from './supabase';
import { PaymentMethod, SessionStatus } from '@/constants/MockData';

// ── row types from Supabase ───────────────────────────────────────────────────

export interface DBPatient {
  id: string;
  user_id: string;
  name: string;
  initials: string;
  age: number | null;
  phone: string | null;
  email: string | null;
  observations: string | null;
  avatar_color: string;
  created_at: string;
  patient_notes: DBNote[];
  sessions: DBSession[];
}

export interface DBNote {
  id: string;
  patient_id: string;
  content: string;
  created_at: string;
}

export interface DBSession {
  id: string;
  patient_id: string;
  date: string;
  status: SessionStatus;
  amount: number;
  paid: boolean;
  payment_method: PaymentMethod | null;
  appointment_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface DBAppointment {
  id: string;
  patient_id: string;
  session_id: string | null;
  date: string;
  time: string;
  duration: number;
  modality: 'presencial' | 'virtual';
  amount: number;
  paid: boolean;
  payment_method: PaymentMethod | null;
  created_at: string;
}

// ── fetch all patients (with nested notes + sessions) ────────────────────────

export async function fetchPatients(): Promise<DBPatient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      patient_notes ( id, patient_id, content, created_at ),
      sessions ( id, patient_id, date, status, amount, paid, payment_method, appointment_id, paid_at, created_at )
    `)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DBPatient[];
}

// ── fetch all appointments ────────────────────────────────────────────────────

export async function fetchAppointments(): Promise<DBAppointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('date', { ascending: true });

  if (error) throw error;
  return (data ?? []) as DBAppointment[];
}

// ── patient mutations ─────────────────────────────────────────────────────────

export async function insertPatient(userId: string, fields: {
  name: string; initials: string; age: number; phone: string;
  email: string; observations: string; avatar_color: string;
}) {
  const { data, error } = await supabase
    .from('patients')
    .insert({ ...fields, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as DBPatient;
}

export async function updatePatientRow(id: string, fields: Partial<{
  name: string; initials: string; age: number; phone: string;
  email: string; observations: string; avatar_color: string;
}>) {
  const { error } = await supabase.from('patients').update(fields).eq('id', id);
  if (error) throw error;
}

export async function deletePatientRow(id: string) {
  const { error } = await supabase.from('patients').delete().eq('id', id);
  if (error) throw error;
}

// ── note mutations ────────────────────────────────────────────────────────────

export async function insertNote(userId: string, patientId: string, content: string) {
  const { data, error } = await supabase
    .from('patient_notes')
    .insert({ user_id: userId, patient_id: patientId, content })
    .select()
    .single();
  if (error) throw error;
  return data as DBNote;
}

export async function updateNoteRow(noteId: string, content: string) {
  const { error } = await supabase
    .from('patient_notes')
    .update({ content })
    .eq('id', noteId);
  if (error) throw error;
}

export async function deleteNoteRow(noteId: string) {
  const { error } = await supabase.from('patient_notes').delete().eq('id', noteId);
  if (error) throw error;
}

// ── appointment + session creation (linked pair) ──────────────────────────────

export async function insertAppointmentWithSession(userId: string, fields: {
  patientId: string;
  date: string;
  time: string;
  duration: number;
  modality: 'presencial' | 'virtual';
  amount: number;
  sessionStatus: SessionStatus;
}) {
  // 1. Insert session first (no appointment_id yet)
  const { data: ses, error: sesErr } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      patient_id: fields.patientId,
      date: fields.date,
      status: fields.sessionStatus,
      amount: fields.amount,
      paid: false,
    })
    .select()
    .single();
  if (sesErr) throw sesErr;

  // 2. Insert appointment linked to session
  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .insert({
      user_id: userId,
      patient_id: fields.patientId,
      session_id: ses.id,
      date: fields.date,
      time: fields.time,
      duration: fields.duration,
      modality: fields.modality,
      amount: fields.amount,
      paid: false,
    })
    .select()
    .single();
  if (apptErr) throw apptErr;

  // 3. Back-link appointment_id on session
  await supabase.from('sessions').update({ appointment_id: appt.id }).eq('id', ses.id);

  return { session: ses as DBSession, appointment: appt as DBAppointment };
}

// ── appointment mutations ─────────────────────────────────────────────────────

export async function updateAppointmentRow(id: string, fields: Partial<{
  date: string; time: string; duration: number; modality: string;
  amount: number; paid: boolean; payment_method: string | null;
}>) {
  const { error } = await supabase.from('appointments').update(fields).eq('id', id);
  if (error) throw error;
}

export async function cancelAppointmentRow(appointmentId: string, sessionId: string | null) {
  const { error: apptErr } = await supabase
    .from('appointments')
    .delete()
    .eq('id', appointmentId);
  if (apptErr) throw apptErr;

  if (sessionId) {
    const { error: sesErr } = await supabase
      .from('sessions')
      .update({ status: 'cancelada' })
      .eq('id', sessionId);
    if (sesErr) throw sesErr;
  }
}

// ── payment mutations ─────────────────────────────────────────────────────────

export async function markSessionsPaidRow(
  sessionIds: string[],
  appointmentIds: string[],
  method: PaymentMethod,
) {
  // paid_at is set server-side by a DB trigger when paid flips to true
  const { error: sesErr } = await supabase
    .from('sessions')
    .update({ paid: true, payment_method: method, status: 'realizada' })
    .in('id', sessionIds);
  if (sesErr) throw sesErr;

  if (appointmentIds.length > 0) {
    const { error: apptErr } = await supabase
      .from('appointments')
      .update({ paid: true, payment_method: method })
      .in('id', appointmentIds);
    if (apptErr) throw apptErr;
  }
}

export async function unmarkSessionPaidRow(sessionId: string, appointmentId: string | null) {
  const { error } = await supabase
    .from('sessions')
    .update({ paid: false, payment_method: null })
    .eq('id', sessionId);
  if (error) throw error;

  if (appointmentId) {
    await supabase
      .from('appointments')
      .update({ paid: false, payment_method: null })
      .eq('id', appointmentId);
  }
}
