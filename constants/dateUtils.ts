/**
 * Parse a YYYY-MM-DD string as a LOCAL date (not UTC).
 * Using new Date('YYYY-MM-DD') parses as UTC midnight, which shifts the day
 * in negative-offset timezones (e.g. Argentina UTC-3 shows the previous day).
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Returns today's date as YYYY-MM-DD using LOCAL time (not UTC).
 */
export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Build a YYYY-MM-DD string from individual parts.
 */
export function buildDateISO(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const _DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const _MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/**
 * Returns today's date as a compact Spanish string, e.g. "Vie, 22 de mayo".
 */
export function formatTodayCompact(): string {
  const d = new Date();
  return `${_DAYS_ES[d.getDay()]}, ${d.getDate()} de ${_MONTHS_ES[d.getMonth()]}`;
}
