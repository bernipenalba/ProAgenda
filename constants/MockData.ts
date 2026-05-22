export type PaymentStatus = 'al_dia' | 'pendiente' | 'adeuda';
export type SessionStatus = 'realizada' | 'cancelada' | 'pendiente';
export type AppointmentModality = 'presencial' | 'virtual';
export type PaymentMethod = 'efectivo' | 'transferencia';

export interface PatientNote {
  id: string;
  content: string;
  createdAt: string; // 'YYYY-MM-DDTHH:MM:SS' local time
}

export interface Session {
  id: string;
  date: string;
  status: SessionStatus;
  amount: number;
  paid: boolean;
  paymentMethod?: PaymentMethod;
  appointmentId?: string;
  paidAt?: string; // local datetime when the payment was registered: 'YYYY-MM-DDTHH:MM:SS'
}

export interface Patient {
  id: string;
  name: string;
  initials: string;
  age: number;
  phone: string;
  email: string;
  observations: string;
  notes: PatientNote[];
  paymentStatus: PaymentStatus;
  nextSession: string | null;
  sessions: Session[];
  avatarColor: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientInitials: string;
  patientAvatarColor: string;
  date: string;
  time: string;
  duration: number;
  modality: AppointmentModality;
  amount: number;
  paid: boolean;
  paymentMethod?: PaymentMethod;
  sessionId?: string;
}

// ── patients ──────────────────────────────────────────────────────────────────
// Sessions are fully linked to appointments via appointmentId / sessionId.
// paymentStatus and nextSession are recomputed from real data in AppContext init.

export const PATIENTS: Patient[] = [
  {
    id: '1',
    name: 'María López',
    initials: 'ML',
    age: 34,
    phone: '+54 9 11 1234-5678',
    email: 'maria.lopez@email.com',
    observations: 'Paciente con tendencia ansiosa. Prefiere sesiones en horario matutino.',
    notes: [
      {
        id: 'n1a',
        content: 'Sesión inicial muy productiva. Identifica bien sus patrones de ansiedad. Se propone práctica diaria de respiración.',
        createdAt: '2026-05-05T09:30:00',
      },
      {
        id: 'n1b',
        content: 'Avance notable en regulación emocional. Mencionó episodio de conflicto laboral que manejó bien. Continuar técnicas de grounding.',
        createdAt: '2026-05-12T09:45:00',
      },
    ],

    paymentStatus: 'al_dia',
    nextSession: null,
    avatarColor: '#D8A48F',
    sessions: [
      { id: 's1', date: '2026-05-05', status: 'realizada', amount: 8000, paid: true, paymentMethod: 'transferencia' },
      { id: 's2', date: '2026-05-12', status: 'realizada', amount: 8000, paid: true, paymentMethod: 'transferencia' },
      { id: 's3', date: '2026-05-19', status: 'realizada', amount: 8000, paid: true, paymentMethod: 'transferencia' },
      { id: 'sa1', date: '2026-05-20', status: 'realizada', amount: 8000, paid: true, paymentMethod: 'transferencia', appointmentId: 'a1' },
      { id: 'sa5', date: '2026-05-21', status: 'pendiente', amount: 8000, paid: false, appointmentId: 'a5' },
      { id: 's4', date: '2026-05-26', status: 'pendiente', amount: 8000, paid: false },
    ],
  },
  {
    id: '2',
    name: 'Juan Pérez',
    initials: 'JP',
    age: 28,
    phone: '+54 9 11 2345-6789',
    email: 'juan.perez@email.com',
    observations: 'Objetivos: mejorar hábitos alimenticios y reducir ingesta de azúcar.',
    notes: [
      {
        id: 'n2a',
        content: 'Costó arrancar pero mostró motivación. Trabaja de noche, hay que adaptar horarios de comidas. Plan inicial acordado.',
        createdAt: '2026-05-01T17:00:00',
      },
    ],

    paymentStatus: 'adeuda',
    nextSession: null,
    avatarColor: '#A3A380',
    sessions: [
      { id: 's5', date: '2026-05-01', status: 'realizada', amount: 7000, paid: true, paymentMethod: 'efectivo' },
      { id: 's6', date: '2026-05-08', status: 'cancelada', amount: 7000, paid: false },
      { id: 's7', date: '2026-05-15', status: 'realizada', amount: 7000, paid: false },
      { id: 'sa3', date: '2026-05-20', status: 'realizada', amount: 7000, paid: false, appointmentId: 'a3' },
      { id: 's8', date: '2026-05-22', status: 'pendiente', amount: 7000, paid: false, appointmentId: 'a8' },
    ],
  },
  {
    id: '3',
    name: 'Sofía Ramírez',
    initials: 'SR',
    age: 41,
    phone: '+54 9 11 3456-7890',
    email: 'sofia.ramirez@email.com',
    observations: 'Rehabilitación de rodilla post-quirúrgica. Muy constante y disciplinada.',
    notes: [
      {
        id: 'n3a',
        content: 'Excelente evolución desde la cirugía del 3 de febrero. ROM aumentó significativamente. Objetivo: retomar actividad deportiva en julio.',
        createdAt: '2026-05-06T10:30:00',
      },
      {
        id: 'n3b',
        content: 'Comenzamos ejercicios de fortalecimiento de cuádriceps. Tolera bien la carga. Muy disciplinada con los ejercicios domiciliarios.',
        createdAt: '2026-05-13T10:15:00',
      },
    ],

    paymentStatus: 'al_dia',
    nextSession: null,
    avatarColor: '#C4A84A',
    sessions: [
      { id: 's9', date: '2026-05-06', status: 'realizada', amount: 9500, paid: true, paymentMethod: 'transferencia' },
      { id: 's10', date: '2026-05-13', status: 'realizada', amount: 9500, paid: true, paymentMethod: 'transferencia' },
      { id: 's11', date: '2026-05-20', status: 'realizada', amount: 9500, paid: true, paymentMethod: 'transferencia', appointmentId: 'a2' },
      { id: 'sa6', date: '2026-05-21', status: 'pendiente', amount: 9500, paid: false, appointmentId: 'a6' },
      { id: 's12', date: '2026-05-27', status: 'pendiente', amount: 9500, paid: false },
    ],
  },
  {
    id: '4',
    name: 'Carlos Méndez',
    initials: 'CM',
    age: 22,
    phone: '+54 9 11 4567-8901',
    email: 'carlos.mendez@email.com',
    observations: 'Preparación examen final de análisis matemático. Universidad UBA.',
    notes: [
      {
        id: 'n4a',
        content: 'Mucha ansiedad ante los exámenes. Trabajamos técnicas de estudio y manejo del estrés académico. Tiene sesiones sin pagar — hablar con él la próxima semana.',
        createdAt: '2026-05-14T18:30:00',
      },
    ],

    paymentStatus: 'adeuda',
    nextSession: null,
    avatarColor: '#BB8588',
    sessions: [
      { id: 's13', date: '2026-05-07', status: 'realizada', amount: 5000, paid: false },
      { id: 's14', date: '2026-05-14', status: 'realizada', amount: 5000, paid: false },
      { id: 'sa4', date: '2026-05-20', status: 'realizada', amount: 5000, paid: false, appointmentId: 'a4' },
      { id: 's15', date: '2026-05-21', status: 'pendiente', amount: 5000, paid: false },
      { id: 'sa9', date: '2026-05-23', status: 'pendiente', amount: 5000, paid: false, appointmentId: 'a9' },
      { id: 's16', date: '2026-05-28', status: 'pendiente', amount: 5000, paid: false },
    ],
  },
  {
    id: '5',
    name: 'Laura Torres',
    initials: 'LT',
    age: 55,
    phone: '+54 9 11 5678-9012',
    email: 'laura.torres@email.com',
    observations: 'Plan de alimentación para diabetes tipo 2. Control mensual con endocrino.',
    notes: [
      {
        id: 'n5a',
        content: 'Muy buena adherencia al plan nutricional. Bajó 4kg en 2 meses. Glucemia en ayunas mejoró de 145 a 112 mg/dl. Continuar con el plan actual.',
        createdAt: '2026-05-13T09:15:00',
      },
    ],

    paymentStatus: 'al_dia',
    nextSession: null,
    avatarColor: '#9E8EA8',
    sessions: [
      { id: 's17', date: '2026-04-29', status: 'realizada', amount: 7000, paid: true, paymentMethod: 'efectivo' },
      { id: 's18', date: '2026-05-13', status: 'realizada', amount: 7000, paid: true, paymentMethod: 'transferencia' },
      { id: 'sa7', date: '2026-05-22', status: 'pendiente', amount: 7000, paid: false, appointmentId: 'a7' },
      { id: 's19', date: '2026-05-27', status: 'pendiente', amount: 7000, paid: false },
    ],
  },
  {
    id: '6',
    name: 'Diego Fernández',
    initials: 'DF',
    age: 38,
    phone: '+54 9 11 6789-0123',
    email: 'diego.fernandez@email.com',
    observations: 'Coaching ejecutivo. Transición de carrera.',
    notes: [
      {
        id: 'n6a',
        content: 'Está evaluando seriamente renunciar. Analizamos pros y contras. Tiene oferta de consultoría independiente. Pendiente resolución.',
        createdAt: '2026-04-12T11:00:00',
      },
    ],

    paymentStatus: 'al_dia',
    nextSession: null,
    avatarColor: '#8E9E8A',
    sessions: [
      { id: 's20', date: '2026-03-15', status: 'realizada', amount: 10000, paid: true, paymentMethod: 'transferencia' },
      { id: 's21', date: '2026-03-29', status: 'realizada', amount: 10000, paid: true, paymentMethod: 'transferencia' },
      { id: 's22', date: '2026-04-12', status: 'cancelada', amount: 10000, paid: false },
    ],
  },
];

// ── appointments ──────────────────────────────────────────────────────────────
// Every appointment has a sessionId that points to its session in the patient record.

export const APPOINTMENTS: Appointment[] = [
  {
    id: 'a1', patientId: '1', patientName: 'María López',
    patientInitials: 'ML', patientAvatarColor: '#D8A48F',
    date: '2026-05-20', time: '09:00', duration: 50, modality: 'virtual',
    amount: 8000, paid: true, paymentMethod: 'transferencia', sessionId: 'sa1',
  },
  {
    id: 'a2', patientId: '3', patientName: 'Sofía Ramírez',
    patientInitials: 'SR', patientAvatarColor: '#C4A84A',
    date: '2026-05-20', time: '11:00', duration: 45, modality: 'presencial',
    amount: 9500, paid: true, paymentMethod: 'transferencia', sessionId: 's11',
  },
  {
    id: 'a3', patientId: '2', patientName: 'Juan Pérez',
    patientInitials: 'JP', patientAvatarColor: '#A3A380',
    date: '2026-05-20', time: '16:00', duration: 50, modality: 'virtual',
    amount: 7000, paid: false, sessionId: 'sa3',
  },
  {
    id: 'a4', patientId: '4', patientName: 'Carlos Méndez',
    patientInitials: 'CM', patientAvatarColor: '#BB8588',
    date: '2026-05-20', time: '17:30', duration: 60, modality: 'presencial',
    amount: 5000, paid: false, sessionId: 'sa4',
  },
  {
    id: 'a5', patientId: '1', patientName: 'María López',
    patientInitials: 'ML', patientAvatarColor: '#D8A48F',
    date: '2026-05-21', time: '10:00', duration: 50, modality: 'virtual',
    amount: 8000, paid: false, sessionId: 'sa5',
  },
  {
    id: 'a6', patientId: '3', patientName: 'Sofía Ramírez',
    patientInitials: 'SR', patientAvatarColor: '#C4A84A',
    date: '2026-05-21', time: '14:00', duration: 45, modality: 'presencial',
    amount: 9500, paid: false, sessionId: 'sa6',
  },
  {
    id: 'a7', patientId: '5', patientName: 'Laura Torres',
    patientInitials: 'LT', patientAvatarColor: '#9E8EA8',
    date: '2026-05-22', time: '09:00', duration: 45, modality: 'presencial',
    amount: 7000, paid: false, sessionId: 'sa7',
  },
  {
    id: 'a8', patientId: '2', patientName: 'Juan Pérez',
    patientInitials: 'JP', patientAvatarColor: '#A3A380',
    date: '2026-05-22', time: '17:00', duration: 50, modality: 'virtual',
    amount: 7000, paid: false, sessionId: 's8',
  },
  {
    id: 'a9', patientId: '4', patientName: 'Carlos Méndez',
    patientInitials: 'CM', patientAvatarColor: '#BB8588',
    date: '2026-05-23', time: '18:00', duration: 60, modality: 'presencial',
    amount: 5000, paid: false, sessionId: 'sa9',
  },
];
