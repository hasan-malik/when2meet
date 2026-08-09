import { EventRepository } from '../ports/event-repository.js';

/**
 * EventRepository backed by a Netlify Blobs store.
 *
 * Every participant owns a distinct key, so two people saving at the same
 * moment never touch the same object — no read-modify-write race, no locking.
 * The store is injected rather than imported so this class stays testable and
 * the Netlify SDK stays at the edge of the system.
 */
export class BlobEventRepository extends EventRepository {
  #store;

  /** @param {{get:Function,setJSON:Function,delete:Function,list:Function}} store */
  constructor(store) {
    super();
    this.#store = store;
  }

  async saveEvent(event) {
    await this.#store.setJSON(eventKey(event.id), event);
  }

  async findEvent(eventId) {
    return (await this.#store.get(eventKey(eventId), { type: 'json' })) ?? null;
  }

  async listParticipants(eventId) {
    const { blobs } = await this.#store.list({ prefix: participantPrefix(eventId) });
    const records = await Promise.all(
      blobs.map((blob) =>
        this.#store.get(blob.key, { type: 'json' }).catch(() => null),
      ),
    );
    return records.filter(Boolean);
  }

  async findParticipant(eventId, participantId) {
    return (
      (await this.#store.get(participantKey(eventId, participantId), { type: 'json' })) ??
      null
    );
  }

  async saveParticipant(eventId, participant) {
    await this.#store.setJSON(participantKey(eventId, participant.id), participant);
  }

  async deleteParticipant(eventId, participantId) {
    await this.#store.delete(participantKey(eventId, participantId));
  }
}

const eventKey = (eventId) => `ev/${eventId}/meta`;
const participantPrefix = (eventId) => `ev/${eventId}/p/`;
const participantKey = (eventId, participantId) =>
  `${participantPrefix(eventId)}${participantId}`;
