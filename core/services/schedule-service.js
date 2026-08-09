import { ScheduleGateway } from '../ports/schedule-gateway.js';
import { AuthError, NotFoundError, ValidationError } from '../domain/errors.js';
import { keepValidSlots, makeEvent } from '../domain/event.js';
import {
  grantSession,
  hasSession,
  identityKey,
  makeParticipant,
  nextAnonymousName,
  normalizeName,
  publicParticipant,
} from '../domain/participant.js';

/**
 * The system's use cases, and the only place they live.
 *
 * Depends on the `EventRepository` and `CryptoProvider` abstractions, both
 * injected — so this class runs identically inside a Netlify Function, an
 * Express server, or a unit test with in-memory doubles.
 *
 * It implements `ScheduleGateway`, meaning a UI can be pointed straight at it
 * with no HTTP in between.
 */
export class ScheduleService extends ScheduleGateway {
  #repository;
  #crypto;
  #now;

  constructor({ repository, crypto, now = () => Date.now() }) {
    super();
    this.#repository = repository;
    this.#crypto = crypto;
    this.#now = now;
  }

  async createEvent(input) {
    const event = makeEvent(input, {
      id: this.#crypto.randomId(10),
      now: this.#now(),
    });
    await this.#repository.saveEvent(event);
    return { event, participants: [] };
  }

  async getEvent(eventId) {
    const event = await this.#requireEvent(eventId);
    const participants = await this.#repository.listParticipants(eventId);
    participants.sort((a, b) => a.createdAt - b.createdAt);
    return { event, participants: participants.map(publicParticipant) };
  }

  async signIn(eventId, { name, password = '' } = {}) {
    await this.#requireEvent(eventId);

    const displayName = normalizeName(name);
    const participantId = this.#participantId(displayName);
    let participant = await this.#repository.findParticipant(eventId, participantId);

    if (participant) {
      if (participant.passwordHash && !password) {
        throw new AuthError('That name is password protected.');
      }
      if (!this.#crypto.verifyPassword(password, participant.passwordHash)) {
        throw new AuthError('Wrong password for that name.');
      }
      // Let someone who skipped a password originally add one later.
      if (!participant.passwordHash && password) {
        participant.passwordHash = this.#crypto.hashPassword(password);
      }
      // Keep the most recent capitalisation of the name.
      participant.name = displayName;
    } else {
      participant = makeParticipant({
        id: participantId,
        name: displayName,
        now: this.#now(),
        passwordHash: password ? this.#crypto.hashPassword(password) : null,
      });
    }

    const token = this.#crypto.randomToken();
    grantSession(participant, this.#crypto.digest(token));
    await this.#repository.saveParticipant(eventId, participant);

    return { token, participant: publicParticipant(participant) };
  }

  /**
   * Join without giving a name. Used the moment someone paints a square, so
   * filling in availability costs nothing up front.
   *
   * Identity is a random id rather than the name, which is what lets the label
   * be changed later and keeps two simultaneous joiners from sharing a row.
   * They get an animal — "Unnamed Otter" — rather than a number.
   */
  async joinAnonymously(eventId) {
    await this.#requireEvent(eventId);
    const existing = await this.#repository.listParticipants(eventId);

    const participant = makeParticipant({
      id: this.#crypto.randomId(16),
      name: nextAnonymousName(existing),
      now: this.#now(),
      anonymous: true,
    });

    const token = this.#crypto.randomToken();
    grantSession(participant, this.#crypto.digest(token));
    await this.#repository.saveParticipant(eventId, participant);

    return { token, participant: publicParticipant(participant) };
  }

  /**
   * Put a name to an anonymous row. Only anonymous rows can be renamed: a
   * named participant's id is derived from their name, so changing it would
   * strand the record under a key nobody looks up.
   */
  async renameParticipant(eventId, credentials, name) {
    await this.#requireEvent(eventId);
    const participant = await this.#authenticate(eventId, credentials);
    if (!participant.anonymous) {
      throw new ValidationError('Sign out and sign back in to change your name.');
    }

    participant.name = normalizeName(name);
    participant.updatedAt = this.#now();
    await this.#repository.saveParticipant(eventId, participant);

    return { participant: publicParticipant(participant) };
  }

  async saveAvailability(eventId, credentials, slots) {
    const event = await this.#requireEvent(eventId);
    const participant = await this.#authenticate(eventId, credentials);

    participant.slots = keepValidSlots(event, slots);
    participant.updatedAt = this.#now();
    await this.#repository.saveParticipant(eventId, participant);

    return { participant: publicParticipant(participant) };
  }

  /** In-process there is no page to lose, so this is an ordinary save. */
  saveOnUnload(eventId, credentials, slots) {
    return this.saveAvailability(eventId, credentials, slots);
  }

  async leaveEvent(eventId, credentials) {
    await this.#requireEvent(eventId);
    const participant = await this.#authenticate(eventId, credentials);
    await this.#repository.deleteParticipant(eventId, participant.id);
    return { ok: true };
  }

  // --- internals ---------------------------------------------------------

  #participantId(displayName) {
    return this.#crypto.digest(identityKey(displayName)).slice(0, 24);
  }

  async #requireEvent(eventId) {
    const event = await this.#repository.findEvent(String(eventId ?? ''));
    if (!event) throw new NotFoundError('That event does not exist.');
    return event;
  }

  async #authenticate(eventId, { participantId, token } = {}) {
    if (!participantId || !token) throw new AuthError('Sign in first.');
    const participant = await this.#repository.findParticipant(eventId, participantId);
    if (!participant) throw new NotFoundError('That participant is no longer on the event.');
    if (!hasSession(participant, this.#crypto.digest(token))) {
      throw new AuthError('Session expired. Sign in again.');
    }
    return participant;
  }
}
