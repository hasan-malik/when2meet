import { ValidationError } from './errors.js';
import { isDateKey, isValidTimeZone, zonedWallToUtc } from './time.js';

/**
 * The Event entity: what times are on offer.
 * Pure data plus the rules that decide whether a value is a legal slot.
 */

export const SLOT_SIZES = Object.freeze([15, 30, 60]);
export const MAX_DATES = 60;
export const MAX_EVENT_NAME = 120;
export const MINUTES_PER_DAY = 1440;

/**
 * @typedef {object} Event
 * @property {string}   id
 * @property {string}   name
 * @property {string[]} dates       sorted "YYYY-MM-DD" keys
 * @property {number}   startMinute minutes past midnight, inclusive
 * @property {number}   endMinute   minutes past midnight, exclusive
 * @property {number}   slotMinutes one of SLOT_SIZES
 * @property {string}   timezone    IANA zone the wall-clock times refer to
 * @property {number}   createdAt
 */

/**
 * Validate raw input and produce a well-formed Event.
 * The single place event rules live — every entry point routes through here.
 *
 * @throws {ValidationError}
 */
export function makeEvent(input, { id, now = Date.now() }) {
  const name = String(input?.name ?? '').trim();
  if (!name) throw new ValidationError('Give the event a name.');
  if (name.length > MAX_EVENT_NAME) throw new ValidationError('That event name is too long.');

  const rawDates = Array.isArray(input?.dates) ? [...new Set(input.dates)] : [];
  if (rawDates.length === 0) throw new ValidationError('Pick at least one date.');
  if (rawDates.length > MAX_DATES)
    throw new ValidationError(`Pick at most ${MAX_DATES} dates.`);
  if (!rawDates.every(isDateKey))
    throw new ValidationError('Dates must look like YYYY-MM-DD.');

  const startMinute = toMinute(input?.startMinute, 'start time');
  const endMinute = toMinute(input?.endMinute, 'end time');
  if (endMinute <= startMinute)
    throw new ValidationError('The end time must be after the start time.');

  const slotMinutes = Number(input?.slotMinutes ?? 30);
  if (!SLOT_SIZES.includes(slotMinutes))
    throw new ValidationError('Unsupported slot length.');

  const timezone = String(input?.timezone || 'UTC');
  if (!isValidTimeZone(timezone)) throw new ValidationError('Unknown timezone.');

  return Object.freeze({
    id,
    name,
    dates: rawDates.sort(),
    startMinute,
    endMinute,
    slotMinutes,
    timezone,
    createdAt: now,
  });
}

function toMinute(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > MINUTES_PER_DAY)
    throw new ValidationError(`Invalid ${label}.`);
  return n;
}

/** Every offered slot, as sorted absolute timestamps. */
export function eventSlots(event) {
  const slots = new Set();
  for (const date of event.dates) {
    for (let m = event.startMinute; m < event.endMinute; m += event.slotMinutes) {
      slots.add(zonedWallToUtc(date, m, event.timezone));
    }
  }
  return [...slots].sort((a, b) => a - b);
}

/** Discard anything that is not a slot this event actually offers. */
export function keepValidSlots(event, slots) {
  const offered = new Set(eventSlots(event));
  const cleaned = new Set();
  for (const ts of Array.isArray(slots) ? slots : []) {
    const n = Number(ts);
    if (offered.has(n)) cleaned.add(n);
  }
  return [...cleaned].sort((a, b) => a - b);
}

export const slotDurationMs = (event) => event.slotMinutes * 60000;
