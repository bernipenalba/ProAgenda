import { z } from 'zod';

// ── shared primitives ─────────────────────────────────────────────────────────

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const nameRegex = /^[A-Za-záéíóúÁÉÍÓÚñÑüÜ\s'-]+$/;

// ── helper ────────────────────────────────────────────────────────────────────

/**
 * Extracts the first error message per field from a failed safeParse result.
 * Returns an empty object when parsing succeeded.
 * Uses a loose parameter type to stay compatible with any Zod schema output.
 */
export function zodFieldErrors(
  result: { success: boolean; error?: { flatten(): { fieldErrors: Record<string, string[] | undefined> } } }
): Record<string, string> {
  if (result.success || !result.error) return {};
  const flat = result.error.flatten().fieldErrors;
  const out: Record<string, string> = {};
  for (const [key, msgs] of Object.entries(flat)) {
    if (msgs && msgs.length > 0) out[key] = msgs[0];
  }
  return out;
}

// ── auth: login ───────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .refine(v => emailRegex.test(v.trim()), 'Formato de email inválido (ej: usuario@gmail.com)'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

// ── auth: signup ──────────────────────────────────────────────────────────────

export const signupSchema = z
  .object({
    email: z
      .string()
      .min(1, 'El email es obligatorio')
      .refine(v => emailRegex.test(v.trim()), 'Formato de email inválido (ej: usuario@gmail.com)'),
    emailConfirm: z.string().min(1, 'Confirmá tu email'),
    password: z
      .string()
      .min(1, 'La contraseña es obligatoria')
      .min(12, 'Mínimo 12 caracteres'),
    passwordConfirm: z.string().min(1, 'Confirmá tu contraseña'),
  })
  .refine(
    d => d.email.trim().toLowerCase() === d.emailConfirm.trim().toLowerCase(),
    { message: 'Los emails no coinciden', path: ['emailConfirm'] }
  )
  .refine(d => d.password === d.passwordConfirm, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirm'],
  });

// ── auth: forgot password ─────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es obligatorio')
    .refine(v => emailRegex.test(v.trim()), 'Formato de email inválido (ej: usuario@gmail.com)'),
});

// ── auth: reset password ──────────────────────────────────────────────────────
// Field key 'confirm' matches the UI state key used in reset-password.tsx.

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'La contraseña es obligatoria')
      .min(12, 'Mínimo 12 caracteres'),
    confirm: z.string().min(1, 'Confirmá la contraseña'),
  })
  .refine(d => d.password === d.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });

// ── account management (logged-in user) ───────────────────────────────────────

export const updateEmailSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
  newEmail: z
    .string()
    .min(1, 'Ingresá el nuevo email')
    .refine(v => emailRegex.test(v.trim()), 'El email no tiene un formato válido'),
});

export const updatePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresá tu contraseña actual'),
    newPassword: z
      .string()
      .min(1, 'Ingresá la nueva contraseña')
      .min(12, 'La contraseña debe tener al menos 12 caracteres'),
    confirmValue: z.string().min(1, 'Confirmá la nueva contraseña'),
  })
  .refine(d => d.newPassword === d.confirmValue, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmValue'],
  });

// ── patient ───────────────────────────────────────────────────────────────────

export const patientSchema = z.object({
  name: z
    .string()
    .min(1, 'El nombre es obligatorio')
    .max(150, 'El nombre no puede superar los 150 caracteres')
    .refine(v => nameRegex.test(v.trim()), 'Solo letras, espacios y acentos (sin números ni símbolos)'),
  age: z
    .string()
    .optional()
    .refine(v => {
      if (!v || !v.trim()) return true;
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 1 && n <= 99;
    }, 'La edad debe ser un número entre 1 y 99'),
  phone: z
    .string()
    .optional()
    .refine(v => {
      if (!v || !v.trim()) return true;
      const digits = v.replace(/\D/g, '');
      return digits.length >= 8 && digits.length <= 15;
    }, 'Ingresá un teléfono válido (mínimo 8 dígitos)'),
  email: z
    .string()
    .optional()
    .refine(v => {
      if (!v || !v.trim()) return true;
      return emailRegex.test(v.trim());
    }, 'Formato de email inválido (ej: usuario@gmail.com)'),
  observations: z
    .string()
    .max(2000, 'Las observaciones no pueden superar los 2000 caracteres')
    .optional(),
});

// ── note ──────────────────────────────────────────────────────────────────────

export const noteSchema = z.object({
  content: z
    .string()
    .min(1, 'La nota no puede estar vacía')
    .max(5000, 'Máximo 5000 caracteres'),
});

// ── appointment ───────────────────────────────────────────────────────────────

export const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Seleccioná un paciente'),
  date: z
    .string()
    .min(1, 'Seleccioná una fecha')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido'),
  time: z
    .string()
    .min(1, 'Seleccioná un horario')
    .regex(/^\d{2}:\d{2}$/, 'Formato de horario inválido'),
  duration: z.string().refine(v => {
    const n = parseInt(v, 10);
    return !isNaN(n) && n >= 1 && n <= 480;
  }, 'Duración inválida (1 a 480 minutos)'),
  modality: z.enum(['presencial', 'virtual']),
  amount: z.string().refine(v => {
    const n = parseInt(v, 10);
    return !isNaN(n) && n >= 0;
  }, 'El honorario debe ser un número válido'),
});
