import { useCallback, useState } from 'react';
import { useSystem } from '../system/SystemProvider.jsx';

/**
 * Who you are on this event. Credentials are held by the SessionStore port,
 * so "remember me" behaviour is a matter of which adapter is wired in.
 */
export function useParticipantSession(eventId) {
  const { gateway, sessionStore } = useSystem();
  const [session, setSession] = useState(() => sessionStore.read(eventId));

  // Returned to callers directly, so a save can use the new credentials
  // without waiting for React to re-render.
  const adopt = useCallback(
    (token, participant) => {
      const next = {
        participantId: participant.id,
        token,
        name: participant.name,
        anonymous: participant.anonymous,
      };
      sessionStore.write(eventId, next);
      setSession(next);
      return next;
    },
    [sessionStore, eventId],
  );

  const signIn = useCallback(
    async (name, password) => {
      const { token, participant } = await gateway.signIn(eventId, { name, password });
      adopt(token, participant);
      return participant;
    },
    [gateway, eventId, adopt],
  );

  /** Claim a row with no name at all — triggered by the first painted square. */
  const joinAnonymously = useCallback(async () => {
    const { token, participant } = await gateway.joinAnonymously(eventId);
    return adopt(token, participant);
  }, [gateway, eventId, adopt]);

  const rename = useCallback(
    async (name) => {
      const current = sessionStore.read(eventId);
      const { participant } = await gateway.renameParticipant(eventId, current, name);
      adopt(current.token, participant);
      return participant;
    },
    [gateway, sessionStore, eventId, adopt],
  );

  const signOut = useCallback(() => {
    sessionStore.clear(eventId);
    setSession(null);
  }, [sessionStore, eventId]);

  return { session, signIn, joinAnonymously, rename, signOut };
}
