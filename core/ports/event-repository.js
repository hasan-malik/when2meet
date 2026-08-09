/**
 * Port: persistence.
 *
 * The service depends on this contract, never on a concrete database. Any
 * implementation that honours these semantics is substitutable — Netlify
 * Blobs, Supabase, Postgres, or the in-memory one used by tests.
 *
 * Contract notes for implementers:
 *  - `findEvent` / `findParticipant` resolve to `null` when absent (never throw).
 *  - Participants are stored per-key, so two people saving at once must not
 *    overwrite each other. Do not read-modify-write a shared document.
 *  - Reads must observe the caller's own most recent write.
 */
export class EventRepository {
  /** @param {import('../domain/event.js').Event} event */
  async saveEvent(event) {
    throw notImplemented('saveEvent');
  }

  /** @returns {Promise<import('../domain/event.js').Event|null>} */
  async findEvent(eventId) {
    throw notImplemented('findEvent');
  }

  /** @returns {Promise<object[]>} every participant record for the event */
  async listParticipants(eventId) {
    throw notImplemented('listParticipants');
  }

  /** @returns {Promise<object|null>} */
  async findParticipant(eventId, participantId) {
    throw notImplemented('findParticipant');
  }

  async saveParticipant(eventId, participant) {
    throw notImplemented('saveParticipant');
  }

  async deleteParticipant(eventId, participantId) {
    throw notImplemented('deleteParticipant');
  }
}

const notImplemented = (method) =>
  new Error(`EventRepository.${method}() is not implemented by this adapter.`);
