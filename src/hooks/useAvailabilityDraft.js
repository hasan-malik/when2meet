import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthError } from '../../core/index.js';
import { useSystem } from '../system/SystemProvider.jsx';

// Long enough to coalesce a burst of edits, short enough that lifting your
// finger feels like it saved instantly.
const SAVE_DELAY_MS = 150;

export const SaveState = Object.freeze({
  IDLE: 'idle',
  SAVING: 'saving',
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
export function useAvailabilityDraft({ eventId, session, remoteSlots, onAuthLost }) {
  const { gateway } = useSystem();
  const [slots, setSlots] = useState(() => new Set(remoteSlots ?? []));
  const [saveState, setSaveState] = useState(SaveState.IDLE);

  const dirtyRef = useRef(false);
  const latestRef = useRef(slots);
  const timerRef = useRef(null);
  const sessionRef = useRef(session);
  sessionRef.current = session;

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
      const current = sessionRef.current;
      if (!current) return;
      try {
        await gateway.saveAvailability(eventId, current, next);
        if (latestRef.current === next) {
          dirtyRef.current = false;
          setSaveState(SaveState.SAVED);
        }
      } catch (error) {
        setSaveState(SaveState.FAILED);
        if (error instanceof AuthError) onAuthLost?.(error);
      }
    },
    [gateway, eventId, onAuthLost],
  );

  const commit = useCallback(
    (next) => {
      latestRef.current = next;
      dirtyRef.current = true;
      setSlots(next);
      setSaveState(SaveState.SAVING);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => push(next), SAVE_DELAY_MS);
    },
    [push],
  );

  const flushNow = useCallback(() => {
    if (!dirtyRef.current) return;
    clearTimeout(timerRef.current);
    push(latestRef.current);
  }, [push]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Best effort if the tab goes away mid-edit.
  useEffect(() => {
    window.addEventListener('pagehide', flushNow);
    return () => window.removeEventListener('pagehide', flushNow);
  }, [flushNow]);

  const reset = useCallback((next = []) => {
    dirtyRef.current = false;
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
