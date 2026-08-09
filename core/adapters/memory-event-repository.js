import { EventRepository } from '../ports/event-repository.js';

/**
 * In-memory EventRepository — for tests, local experiments, and as the
 * reference implementation of the port's semantics.
 *
 * Proves the abstraction holds: `new ScheduleService({ repository: new
 * MemoryEventRepository(), crypto })` gives you the whole system with no
 * network and no Netlify.
 */
export class MemoryEventRepository extends EventRepository {
  #events = new Map();
  #participants = new Map(); // eventId -> Map<participantId, record>

  async saveEvent(event) {
    this.#events.set(event.id, clone(event));
  }

  async findEvent(eventId) {
    const event = this.#events.get(eventId);
    return event ? clone(event) : null;
  }

  async listParticipants(eventId) {
    return [...(this.#participants.get(eventId)?.values() ?? [])].map(clone);
  }

  async findParticipant(eventId, participantId) {
    const record = this.#participants.get(eventId)?.get(participantId);
    return record ? clone(record) : null;
  }

  async saveParticipant(eventId, participant) {
    if (!this.#participants.has(eventId)) this.#participants.set(eventId, new Map());
    this.#participants.get(eventId).set(participant.id, clone(participant));
  }

  async deleteParticipant(eventId, participantId) {
    this.#participants.get(eventId)?.delete(participantId);
  }
}

// Copy on the way in and out, so callers can never mutate stored state by
// holding a reference — matching how a real datastore behaves.
const clone = (value) => JSON.parse(JSON.stringify(value));
