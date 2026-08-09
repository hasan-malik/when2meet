import { ScheduleGateway } from '../ports/schedule-gateway.js';
import { AuthError, DomainError, NotFoundError, ValidationError } from '../domain/errors.js';

/**
 * ScheduleGateway that speaks to the REST API.
 *
 * The only module in the browser bundle that knows a network exists. It also
 * rebuilds domain error types from the wire format, so UI code can branch on
 * `AuthError` without caring that HTTP happened.
 */
export class HttpScheduleGateway extends ScheduleGateway {
  #baseUrl;
  #fetch;

  constructor({ baseUrl = '/api', fetchImpl } = {}) {
    super();
    this.#baseUrl = baseUrl.replace(/\/$/, '');
    // Bound so it can be swapped for a stub in tests.
    this.#fetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));
  }

  async createEvent(input) {
    return this.#send('POST', '/events', input);
  }

  async getEvent(eventId) {
    return this.#send('GET', `/events/${encodeURIComponent(eventId)}`);
  }

  async signIn(eventId, { name, password = '' }) {
    return this.#send('POST', `/events/${encodeURIComponent(eventId)}/signin`, {
      name,
      password,
    });
  }

  async saveAvailability(eventId, { participantId, token }, slots) {
    return this.#send('PUT', `/events/${encodeURIComponent(eventId)}/availability`, {
      participantId,
      token,
      slots: [...slots],
    });
  }

  async #send(method, path, body) {
    let response;
    try {
      response = await this.#fetch(`${this.#baseUrl}${path}`, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new DomainError('Network unavailable. Check your connection.', 'network');
    }

    const payload = await response.json().catch(() => null);
    if (response.ok) return payload;
    throw toDomainError(response.status, payload?.error);
  }
}

function toDomainError(status, message) {
  switch (status) {
    case 400:
      return new ValidationError(message ?? 'That request was not valid.');
    case 401:
    case 403:
      return new AuthError(message ?? 'Not authorised.');
    case 404:
      return new NotFoundError(message ?? 'Not found.');
    default:
      return new DomainError(message ?? 'Something went wrong.', 'unknown');
  }
}
