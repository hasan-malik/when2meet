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

/**
 * Labels for people who never gave a name: "Unnamed Panda", "Unnamed Jaguar".
 * Easier to tell apart at a glance than numbers, and easier to say out loud
 * when you are working out whose row is whose.
 *
 * Identity for these is a random id rather than the name, so a repeated label
 * would be cosmetic rather than a collision.
 */
export const ANONYMOUS_PREFIX = 'Unnamed';

export const ANONYMOUS_ANIMALS = Object.freeze([
  'Panda', 'Jaguar', 'Iguana', 'Otter', 'Falcon', 'Badger', 'Heron', 'Lynx',
  'Narwhal', 'Ocelot', 'Puffin', 'Quokka', 'Raccoon', 'Tapir', 'Walrus', 'Yak',
  'Zebra', 'Bison', 'Caribou', 'Dingo', 'Egret', 'Ferret', 'Gecko', 'Hedgehog',
  'Impala', 'Kestrel', 'Lemur', 'Manatee', 'Osprey', 'Pelican', 'Toucan',
  'Wombat', 'Marmot', 'Stoat', 'Antelope', 'Vulture', 'Salamander', 'Albatross',
]);

/** The first animal nobody has taken, cycling with a suffix once exhausted. */
export function nextAnonymousName(participants) {
  const taken = new Set(participants.map((p) => p.name));
  const free = (label) => !taken.has(label);

  for (const animal of ANONYMOUS_ANIMALS) {
    const label = `${ANONYMOUS_PREFIX} ${animal}`;
    if (free(label)) return label;
  }
  for (let round = 2; ; round++) {
    for (const animal of ANONYMOUS_ANIMALS) {
      const label = `${ANONYMOUS_PREFIX} ${animal} ${round}`;
      if (free(label)) return label;
    }
  }
}

export function makeParticipant({
  id,
  name,
  now = Date.now(),
  passwordHash = null,
  anonymous = false,
}) {
  return {
    id,
    name,
    slots: [],
    anonymous,
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
    anonymous: Boolean(participant.anonymous),
    hasPassword: Boolean(participant.passwordHash),
    updatedAt: participant.updatedAt,
  };
}
