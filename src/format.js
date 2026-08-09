import { slotDateKey, slotMinuteOfDay } from '../core/index.js';

/**
 * Presentation formatting — the UI's business, not the system's.
 *
 * Everything here is plain calendar arithmetic. No timezone is ever consulted,
 * because a slot means the same wall-clock time to everybody looking at it.
 */

export function formatMinuteOfDay(minuteOfDay, use24h = false) {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  const minute = minuteOfDay % 60;
  if (use24h) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0
    ? `${h12} ${suffix}`
    : `${h12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

/** Column heading pieces for a "YYYY-MM-DD" key. */
export function formatDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  // Noon UTC plus UTC readers keeps the calendar date stable everywhere.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    weekdayLong: date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }),
    month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    day,
    year,
  };
}

/**
 * e.g. "Sat, Aug 15 · 2:00 PM – 3:30 PM", or "Saturdays · 2:00 PM – 3:30 PM"
 * for an event surveyed by day of the week, where the date is meaningless.
 *
 * `endExclusive` is a minute-of-day, so a window running to midnight reads as
 * 12:00 AM rather than wrapping to the start of the same day.
 */
export function formatWindow(startSlot, endMinuteExclusive, { weekdaysOnly = false } = {}) {
  const { weekday, weekdayLong, month, day } = formatDateKey(slotDateKey(startSlot));
  const label = weekdaysOnly ? `${weekdayLong}s` : `${weekday}, ${month} ${day}`;
  const from = formatMinuteOfDay(slotMinuteOfDay(startSlot));
  const to = formatMinuteOfDay(endMinuteExclusive);
  return `${label} · ${from} – ${to}`;
}

export const pluralize = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
