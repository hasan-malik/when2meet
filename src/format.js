/**
 * Presentation formatting — the UI's business, not the system's.
 * The core deals in instants and minute offsets; this turns them into English.
 */

export const localTimeZone = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const allTimeZones = () => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [localTimeZone(), 'UTC'];
  }
};

export const prettyZone = (tz) => tz.replace(/_/g, ' ');

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
  // Noon UTC keeps the calendar date stable under any formatter timezone.
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return {
    weekday: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
    month: date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    day,
    year,
  };
}

const timeOnly = (ts, timeZone) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(ts));

/** e.g. "Sat, Aug 15 · 2:00 PM – 3:30 PM" */
export function formatWindow(start, endExclusive, timeZone) {
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(start));
  return `${day} · ${timeOnly(start, timeZone)} – ${timeOnly(endExclusive, timeZone)}`;
}

export const pluralize = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
