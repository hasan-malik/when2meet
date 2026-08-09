import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthError } from '../../core/index.js';
import { useSystem } from '../system/SystemProvider.jsx';

// Long enough to coalesce a burst of edits, short enough that lifting your
// finger feels like it saved instantly.
const SAVE_DELAY_MS = 150;

// A dropped connection is usually brief, so keep trying before giving up.
const MAX_ATTEMPTS = 5;
const RETRY_BASE_MS = 800;

export const SaveState = Object.freeze({
  IDLE: 'idle',
  SAVING: 'saving',
  RETRYING: 'retrying',
  SAVED: 'saved',
  FAILED: 'failed',
});

/**
 * Your own availability: an optimistic local selection that writes through to
 * the gateway on every change.
 *
 * The local Set is authoritative while you edit, so a background refresh can
 * never overwrite a stroke you just made.
 */
export function useAvailabilityDraft({
  eventId,
  session,
  remoteSlots,
  onAuthLost,
  ensureSession,
}) {
  const { gateway } = useSystem();
  const [slots, setSlots] = useState(() => new Set(remoteSlots ?? []));
  const [saveState, setSaveState] = useState(SaveState.IDLE);

  const dirtyRef = useRef(false);
  const latestRef = useRef(slots);
  const timerRef = useRef(null);
  const attemptsRef = useRef(0);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const ensureRef = useRef(ensureSession);
  ensureRef.current = ensureSession;

  // Adopt the server's copy only when we have nothing unsaved in hand.
  useEffect(() => {
    if (dirtyRef.current || !remoteSlots) return;
    const next = new Set(remoteSlots);
    if (!sameSet(next, latestRef.current)) {
      latestRef.current = next;
      setSlots(next);
    }
  }, [remoteSlots]);

  const push = useCallback(
    async (next) => {
      try {
        // Painting is allowed before anyone has identified themselves; the
        // first save is what actually creates the row.
        const current = sessionRef.current ?? (await ensureRef.current?.());
        if (!current) return;
        await gateway.saveAvailability(eventId, current, next);
        if (latestRef.current === next) {
          dirtyRef.current = false;
          attemptsRef.current = 0;
          setSaveState(SaveState.SAVED);
        }
      } catch (error) {
        // A rejected session will never succeed by trying again.
        if (error instanceof AuthError) {
          setSaveState(SaveState.FAILED);
          onAuthLost?.(error);
          return;
        }
        // Anything else is probably the network. Back off and try again, but
        // only while this is still the newest selection — a later edit
        // supersedes it and starts its own attempts.
        const superseded = latestRef.current !== next;
        if (!superseded && attemptsRef.current < MAX_ATTEMPTS) {
          const delay = RETRY_BASE_MS * 2 ** attemptsRef.current;
          attemptsRef.current += 1;
          setSaveState(SaveState.RETRYING);
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => push(next), delay);
          return;
        }
        if (!superseded) setSaveState(SaveState.FAILED);
      }
    },
    [gateway, eventId, onAuthLost],
  );

  const commit = useCallback(
    (next) => {
      latestRef.current = next;
      dirtyRef.current = true;
      attemptsRef.current = 0;
      setSlots(next);
      setSaveState(SaveState.SAVING);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => push(next), SAVE_DELAY_MS);
    },
    [push],
  );

  const flushNow = useCallback(() => {
    if (!dirtyRef.current) return;
    const current = sessionRef.current;
    if (!current) return; // never painted, nothing claimed yet
    clearTimeout(timerRef.current);
    gateway.saveOnUnload(eventId, current, latestRef.current);
  }, [gateway, eventId]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // The tab going away mid-edit must not lose the stroke.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') flushNow();
    };
    window.addEventListener('pagehide', flushNow);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', flushNow);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [flushNow]);

  const reset = useCallback((next = []) => {
    dirtyRef.current = false;
    attemptsRef.current = 0;
    const set = new Set(next);
    latestRef.current = set;
    setSlots(set);
    setSaveState(SaveState.IDLE);
  }, []);

  return { slots, commit, reset, saveState, isDirty: () => dirtyRef.current };
}

function sameSet(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
