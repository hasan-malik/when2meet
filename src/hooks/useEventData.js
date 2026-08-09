import { useCallback, useEffect, useRef, useState } from 'react';
import { useSystem } from '../system/SystemProvider.jsx';

/**
 * Loads an event through the gateway port and keeps it fresh.
 *
 * Knows nothing about HTTP — swap in a gateway backed by websockets or an
 * in-memory service and this hook is unchanged.
 */
export function useEventData(eventId, { pollMs = 5000, paused = false } = {}) {
  const { gateway } = useSystem();
  const [state, setState] = useState({
    status: 'loading',
    event: null,
    participants: [],
    error: null,
  });

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const load = useCallback(
    async ({ initial = false } = {}) => {
      try {
        const { event, participants } = await gateway.getEvent(eventId);
        setState({ status: 'ready', event, participants, error: null });
      } catch (error) {
        // A failed background refresh shouldn't blow away a working screen.
        if (initial) {
          setState({ status: 'error', event: null, participants: [], error });
        }
      }
    },
    [gateway, eventId],
  );

  useEffect(() => {
    load({ initial: true });
  }, [load]);

  useEffect(() => {
    if (state.status !== 'ready' || !pollMs) return undefined;
    const timer = setInterval(() => {
      if (!pausedRef.current && !document.hidden) load();
    }, pollMs);
    return () => clearInterval(timer);
  }, [state.status, pollMs, load]);

  return { ...state, reload: load };
}
