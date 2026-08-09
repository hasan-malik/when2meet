/**
 * Timezone primitives built on Intl — no date library, no platform APIs.
 *
 * Availability is stored as absolute epoch milliseconds. Wall-clock times only
 * exist at the edges: when an organiser defines an event, and when a viewer
 * renders it. Everything in between is an instant.
 */

const formatters = new Map();

function partsFormatter(timeZone) {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

function wallParts(ts, timeZone) {
  const out = {};
  for (const p of partsFormatter(timeZone).formatToParts(new Date(ts))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  // Some engines emit hour 24 for midnight.
  if (out.hour === 24) out.hour = 0;
  return out;
}

export function isValidTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Offset of `timeZone` from UTC in ms, at the instant `ts`. */
export function tzOffsetMs(ts, timeZone) {
  const p = wallParts(ts, timeZone);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - ts;
}

/**
 * Absolute timestamp for a wall-clock time in `timeZone`.
 * @param {string} dateKey "YYYY-MM-DD"
 * @param {number} minuteOfDay minutes past local midnight
 */
export function zonedWallToUtc(dateKey, minuteOfDay, timeZone) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minuteOfDay);
  let ts = guess - tzOffsetMs(guess, timeZone);
  // One refinement pass settles DST transitions.
  const offset = tzOffsetMs(ts, timeZone);
  if (guess - offset !== ts) ts = guess - offset;
  return ts;
}

/** Local date key and minute-of-day for `ts` as seen in `timeZone`. */
export function instantToWall(ts, timeZone) {
  const p = wallParts(ts, timeZone);
  const dateKey = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
  return { dateKey, minuteOfDay: p.hour * 60 + p.minute };
}

export const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value) {
  return typeof value === 'string' && DATE_KEY_PATTERN.test(value);
}
