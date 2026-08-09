/**
 * Slot identity — the one number everything else is built on.
 *
 * This app is deliberately timezone-free: it is for a group of people in the
 * same place, so "10:15 on the 14th" means the same thing to everyone and
 * never needs converting. A slot is therefore a wall-clock coordinate, not an
 * instant, and no `Date` with a timezone is ever consulted.
 *
 * Slots encode as a single integer — `daysSinceEpoch * 1440 + minuteOfDay` —
 * which keeps them sortable, comparable, and cheap to hold in a Set, and makes
 * "is the next slot contiguous?" a subtraction.
 */

export const MINUTES_PER_DAY = 1440;
const MS_PER_DAY = 86400000;

export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const isDateKey = (value) =>
  typeof value === 'string' && DATE_KEY_PATTERN.test(value);

/**
 * Days since 1970-01-01 for a "YYYY-MM-DD" key.
 * `Date.UTC` is pure proleptic-Gregorian arithmetic — it reads no timezone.
 */
export function dayIndex(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

/** Inverse of `dayIndex`. */
export function dateKeyOf(days) {
  const date = new Date(days * MS_PER_DAY);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const makeSlotId = (dateKey, minuteOfDay) =>
  dayIndex(dateKey) * MINUTES_PER_DAY + minuteOfDay;

export const slotDateKey = (slotId) =>
  dateKeyOf(Math.floor(slotId / MINUTES_PER_DAY));

export const slotMinuteOfDay = (slotId) =>
  ((slotId % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;

/** Day of the week for a date key, 0 = Sunday. Pure calendar arithmetic. */
export const weekdayIndex = (dateKey) => (((dayIndex(dateKey) + 4) % 7) + 7) % 7;
