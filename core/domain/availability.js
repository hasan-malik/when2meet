/**
 * Aggregation over everyone's answers: who is free when, and when is best.
 * Pure functions over plain data so they can serve a grid, an export, or a
 * notification job equally well.
 */

/**
 * @param {{id:string, slots:number[]}[]} participants
 * @returns {Map<number, string[]>} slot -> ids of the people free then
 */
export function tallyAvailability(participants) {
  const bySlot = new Map();
  for (const person of participants) {
    for (const ts of person.slots) {
      const ids = bySlot.get(ts);
      if (ids) ids.push(person.id);
      else bySlot.set(ts, [person.id]);
    }
  }
  return bySlot;
}

export const countAt = (tally, ts) => tally.get(ts)?.length ?? 0;

/** Fraction of respondents free at `ts`, in [0, 1]. */
export function intensityAt(tally, ts, total) {
  if (!total) return 0;
  return countAt(tally, ts) / total;
}

/** Who is free and who is not, for one slot. */
export function attendanceAt(tally, ts, participants) {
  const free = new Set(tally.get(ts) ?? []);
  const available = [];
  const unavailable = [];
  for (const person of participants) {
    (free.has(person.id) ? available : unavailable).push(person);
  }
  return { available, unavailable };
}

/**
 * @typedef {object} TimeWindow
 * @property {number} start first slot's instant
 * @property {number} end   last slot's instant (exclusive end = end + slotMs)
 * @property {number} slots how many slots long
 * @property {number} count how many people are free throughout
 */

/**
 * Contiguous windows where attendance is highest, longest first.
 *
 * @param {number[]} slots ascending slot instants
 * @param {Map<number,string[]>} tally
 * @param {number} slotMs duration of one slot
 * @param {number} [limit]
 * @returns {{best:number, windows:TimeWindow[], slotMs:number}}
 */
export function findBestWindows(slots, tally, slotMs, limit = 3) {
  let best = 0;
  for (const ts of slots) best = Math.max(best, countAt(tally, ts));
  if (best === 0) return { best: 0, windows: [], slotMs };

  const windows = [];
  let current = null;

  for (const ts of slots) {
    const atPeak = countAt(tally, ts) === best;
    if (!atPeak) {
      current = null;
      continue;
    }
    const contiguous = current && ts - current.end === slotMs;
    if (contiguous) {
      current.end = ts;
      current.slots += 1;
    } else {
      current = { start: ts, end: ts, slots: 1, count: best };
      windows.push(current);
    }
  }

  windows.sort((a, b) => b.slots - a.slots || a.start - b.start);
  return { best, windows: windows.slice(0, limit), slotMs };
}
