import { ValidationError } from './errors.js';
import { isDateKey, makeSlotId, MINUTES_PER_DAY } from './slot.js';

/**
 * The Event entity: what times are on offer.
 * Pure data plus the rules that decide whether a value is a legal slot.
 */

/**
 * Fixed at 15 minutes, matching When2Meet. Not configurable — one less
 * decision when creating an event, and one less variable everywhere else.
 */
export const SLOT_MINUTES = 15;

export const MAX_DATES = 60;
export const MAX_EVENT_NAME = 120;
export { MINUTES_PER_DAY };

export const EventMode = Object.freeze({
  DATES: 'dates',
  WEEKDAYS: 'weekdays',
});

/**
 * A "days of the week" event has no real dates, so its days are pinned to one
 * anchor week. Slots stay ordinary slot ids, which means selection, tallying
 * and best-times work on weekday events without a single special case.
 * Mon 1 - Sun 7 January 2024.
 */
export const WEEKDAY_ANCHOR = Object.freeze([
  '2024-01-01', // Monday
  '2024-01-02',
  '2024-01-03',
  '2024-01-04',
  '2024-01-05',
  '2024-01-06',
  '2024-01-07', // Sunday
]);

/**
 * @typedef {object} Event
 * @property {string}   id
 * @property {string}   name
 * @property {'dates'|'weekdays'} mode
 * @property {string[]} dates       sorted "YYYY-MM-DD" keys
 * @property {number}   startMinute minutes past midnight, inclusive
 * @property {number}   endMinute   minutes past midnight, exclusive
 * @property {number}   slotMinutes always SLOT_MINUTES; stored so records are
 *                                  self-describing
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

  const mode = input?.mode === EventMode.WEEKDAYS ? EventMode.WEEKDAYS : EventMode.DATES;
  const weekly = mode === EventMode.WEEKDAYS;
  const noun = weekly ? 'day' : 'date';

  const rawDates = Array.isArray(input?.dates) ? [...new Set(input.dates)] : [];
  if (rawDates.length === 0) throw new ValidationError(`Pick at least one ${noun}.`);
  if (rawDates.length > MAX_DATES)
    throw new ValidationError(`Pick at most ${MAX_DATES} dates.`);
  if (!rawDates.every(isDateKey))
    throw new ValidationError('Dates must look like YYYY-MM-DD.');
  if (weekly && !rawDates.every((d) => WEEKDAY_ANCHOR.includes(d)))
    throw new ValidationError('Weekday events must use the anchor week.');

  const startMinute = toMinute(input?.startMinute, 'start time');
  const endMinute = toMinute(input?.endMinute, 'end time');
  if (endMinute <= startMinute)
    throw new ValidationError('The end time must be after the start time.');

  return Object.freeze({
    id,
    name,
    mode,
    dates: rawDates.sort(),
    startMinute,
    endMinute,
    slotMinutes: SLOT_MINUTES,
    createdAt: now,
  });
}

function toMinute(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > MINUTES_PER_DAY)
    throw new ValidationError(`Invalid ${label}.`);
  if (n % SLOT_MINUTES !== 0)
    throw new ValidationError(`The ${label} must land on a ${SLOT_MINUTES} minute boundary.`);
  return n;
}

/** Every offered slot, ascending. */
export function eventSlots(event) {
  const step = event.slotMinutes ?? SLOT_MINUTES;
  const slots = [];
  for (const date of event.dates) {
    for (let m = event.startMinute; m < event.endMinute; m += step) {
      slots.push(makeSlotId(date, m));
    }
  }
  return slots.sort((a, b) => a - b);
}

/** Discard anything that is not a slot this event actually offers. */
export function keepValidSlots(event, slots) {
  const offered = new Set(eventSlots(event));
  const cleaned = new Set();
  for (const slot of Array.isArray(slots) ? slots : []) {
    const n = Number(slot);
    if (offered.has(n)) cleaned.add(n);
  }
  return [...cleaned].sort((a, b) => a - b);
}

/** Distance between adjacent slots, in slot-id units. */
export const slotStep = (event) => event.slotMinutes ?? SLOT_MINUTES;
