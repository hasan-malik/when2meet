/**
 * Port: cryptography.
 *
 * Keeps `node:crypto` (and any future WebCrypto or KMS backend) out of the
 * domain. Password hashing must be slow and salted; `digest` is only used for
 * deriving stable storage keys and comparing tokens.
 */
export class CryptoProvider {
  /** @returns {string} opaque, unguessable session token */
  randomToken() {
    throw notImplemented('randomToken');
  }

  /** @returns {string} short, URL-safe, collision-resistant id */
  randomId(length) {
    throw notImplemented('randomId');
  }

  /** @returns {string} salted hash, self-describing enough for `verifyPassword` */
  hashPassword(password) {
    throw notImplemented('hashPassword');
  }

  /** Constant-time where it matters. `stored == null` means "no password set". */
  verifyPassword(password, stored) {
    throw notImplemented('verifyPassword');
  }

  /** Fast one-way digest, hex encoded. */
  digest(value) {
    throw notImplemented('digest');
  }
}

const notImplemented = (method) =>
  new Error(`CryptoProvider.${method}() is not implemented by this adapter.`);
