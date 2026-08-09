import { useCallback, useState } from 'react';
import { useSystem } from '../system/SystemProvider.jsx';

/**
 * Who you are on this event. Credentials are held by the SessionStore port,
 * so "remember me" behaviour is a matter of which adapter is wired in.
 */
export function useParticipantSession(eventId) {
  const { gateway, sessionStore } = useSystem();
  const [session, setSession] = useState(() => sessionStore.read(eventId));

  const signIn = useCallback(
    async (name, password) => {
      const { token, participant } = await gateway.signIn(eventId, { name, password });
      const next = { participantId: participant.id, token, name: participant.name };
      sessionStore.write(eventId, next);
      setSession(next);
      return participant;
    },
    [gateway, sessionStore, eventId],
  );

  const signOut = useCallback(() => {
    sessionStore.clear(eventId);
    setSession(null);
  }, [sessionStore, eventId]);

  return { session, signIn, signOut };
}
