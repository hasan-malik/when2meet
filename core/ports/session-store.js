/**
 * Port: where a client keeps its per-event credentials.
 * Browser localStorage, a cookie, React Native AsyncStorage, or memory.
 */
export class SessionStore {
  /** @returns {{participantId:string, token:string, name:string}|null} */
  read(eventId) {
    throw notImplemented('read');
  }

  write(eventId, session) {
    throw notImplemented('write');
  }

  clear(eventId) {
    throw notImplemented('clear');
  }
}

const notImplemented = (method) =>
  new Error(`SessionStore.${method}() is not implemented by this adapter.`);
