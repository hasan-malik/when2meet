import { SessionStore } from '../ports/session-store.js';

/** SessionStore over Web Storage, degrading to memory in private mode. */
export class LocalSessionStore extends SessionStore {
  #prefix;
  #storage;
  #fallback = new Map();

  constructor({ prefix = 'w2m:session', storage } = {}) {
    super();
    this.#prefix = prefix;
    this.#storage = storage ?? safeLocalStorage();
  }

  read(eventId) {
    const raw = this.#storage
      ? this.#storage.getItem(this.#key(eventId))
      : this.#fallback.get(eventId);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  write(eventId, session) {
    const raw = JSON.stringify(session);
    if (this.#storage) {
      try {
        this.#storage.setItem(this.#key(eventId), raw);
        return;
      } catch {
        /* quota or private mode — fall through */
      }
    }
    this.#fallback.set(eventId, raw);
  }

  clear(eventId) {
    this.#fallback.delete(eventId);
    try {
      this.#storage?.removeItem(this.#key(eventId));
    } catch {
      /* ignore */
    }
  }

  #key(eventId) {
    return `${this.#prefix}:${eventId}`;
  }
}

function safeLocalStorage() {
  try {
    const probe = '__w2m__';
    globalThis.localStorage.setItem(probe, '1');
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
