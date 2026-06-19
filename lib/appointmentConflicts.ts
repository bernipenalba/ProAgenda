import { Appointment } from '@/constants/MockData';

// Used when an existing appointment has no duration stored in the DB.
const DEFAULT_DURATION_MINUTES = 60;

// Appointments cannot end after this hour (exclusive).
const CUTOFF_HOUR = 21;

// Must match the hour/minute grids in TimePicker.tsx.
const HOURS = ['08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21'];
const MINUTES = ['00', '15', '30', '45'];

/** Returns true when two half-open intervals [a,b) and [c,d) overlap. */
export function appointmentsOverlap(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date,
): boolean {
  return newStart < existingEnd && newEnd > existingStart;
}

/**
 * Builds a start/end Date pair using local-time construction
 * (same convention as parseLocalDate in dateUtils — avoids UTC shift in Argentina).
 */
export function buildAppointmentInterval(
  date: string,          // YYYY-MM-DD
  time: string,          // HH:MM
  durationMinutes: number,
): { start: Date; end: Date } {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const start = new Date(year, month - 1, day, hour, minute, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  return { start, end };
}

/**
 * Returns the first appointment that conflicts with the given slot.
 * Pass `excludeId` when editing so the appointment doesn't conflict with itself.
 * Appointments without a stored duration fall back to DEFAULT_DURATION_MINUTES.
 */
export function findConflict(
  appointments: Appointment[],
  date: string,
  time: string,
  durationMinutes: number,
  excludeId?: string,
): Appointment | null {
  const { start: newStart, end: newEnd } = buildAppointmentInterval(date, time, durationMinutes);

  for (const a of appointments) {
    if (a.date !== date) continue;
    if (excludeId && a.id === excludeId) continue;

    const existingDuration = a.duration ?? DEFAULT_DURATION_MINUTES;
    const { start: existingStart, end: existingEnd } = buildAppointmentInterval(
      a.date,
      a.time,
      existingDuration,
    );

    if (appointmentsOverlap(newStart, newEnd, existingStart, existingEnd)) {
      return a;
    }
  }

  return null;
}

/**
 * Returns all HH:MM slots from the TimePicker grid that would be invalid
 * for a new appointment of `newDuration` minutes on `date`.
 *
 * A slot is blocked when:
 *  - it overlaps an existing appointment (interval check, not exact match), OR
 *  - the appointment would end after 21:00.
 *
 * Pass `excludeId` when editing to avoid the appointment blocking itself.
 */
export function getBlockedStartSlots(
  appointments: Appointment[],
  date: string,
  newDuration: number,
  excludeId?: string,
): string[] {
  if (!date || newDuration < 1) return [];

  const [year, month, day] = date.split('-').map(Number);
  const cutoff = new Date(year, month - 1, day, CUTOFF_HOUR, 0, 0);
  const blocked: string[] = [];

  for (const h of HOURS) {
    for (const m of MINUTES) {
      const time = `${h}:${m}`;
      const { end } = buildAppointmentInterval(date, time, newDuration);
      if (end > cutoff) {
        blocked.push(time);
        continue;
      }
      if (findConflict(appointments, date, time, newDuration, excludeId)) {
        blocked.push(time);
      }
    }
  }

  return blocked;
}

/** Formats a Date as "HH:MM". */
export function formatTimeHHMM(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
