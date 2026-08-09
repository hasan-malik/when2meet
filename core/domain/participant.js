import { ValidationError } from './errors.js';

/**
 * The Participant entity: one person's answer to one event.
 * Identity is the normalised name — the same rule When2Meet uses, so returning
 * with the same name resumes your row rather than creating a second one.
 */

export const MAX_PARTICIPANT_NAME = 60;

export function normalizeName(name) {
  const trimmed = String(name ?? '').trim().replace(/\s+/g, ' ');
  if (!trimmed) throw new ValidationError('Enter your name.');
  if (trimmed.length > MAX_PARTICIPANT_NAME)
    throw new ValidationError('That name is too long.');
  return trimmed;
}

/** Case- and whitespace-insensitive identity key for a display name. */
export const identityKey = (name) => normalizeName(name).toLowerCase();

/** How many devices can hold a live session for one person at once. */
export const MAX_SESSIONS = 5;

export function makeParticipant({ id, name, now = Date.now(), passwordHash = null }) {
  return {
    id,
    name,
    slots: [],
    passwordHash,
    tokenHashes: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Register a new session without evicting the others, so signing in on your
 * phone doesn't log you out on your laptop. Oldest session drops off first.
 */
export function grantSession(participant, tokenHash) {
  const existing = participant.tokenHashes ?? [];
  participant.tokenHashes = [...existing, tokenHash].slice(-MAX_SESSIONS);
  return participant;
}

export const hasSession = (participant, tokenHash) =>
  (participant.tokenHashes ?? []).includes(tokenHash);

/** The projection safe to hand to any client: no secrets. */
export function publicParticipant(participant) {
  return {
    id: participant.id,
    name: participant.name,
    slots: participant.slots,
    hasPassword: Boolean(participant.passwordHash),
    updatedAt: participant.updatedAt,
  };
}
