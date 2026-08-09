import crypto from 'node:crypto';
import { CryptoProvider } from '../ports/crypto-provider.js';

// Ambiguity-free alphabet for shareable links: no 0/O/1/l/I.
const ID_ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz';
const SCRYPT_KEYLEN = 64;

/** CryptoProvider backed by Node's crypto module. */
export class NodeCryptoProvider extends CryptoProvider {
  randomToken() {
    return crypto.randomBytes(24).toString('hex');
  }

  randomId(length = 10) {
    const bytes = crypto.randomBytes(length);
    let out = '';
    for (const b of bytes) out += ID_ALPHABET[b % ID_ALPHABET.length];
    return out;
  }

  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex');
    return `scrypt:${salt}:${hash}`;
  }

  verifyPassword(password, stored) {
    if (!stored) return true; // no password was ever set
    const [scheme, salt, hash] = String(stored).split(':');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const expected = Buffer.from(hash, 'hex');
    const actual = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
  }

  digest(value) {
    return crypto.createHash('sha256').update(String(value)).digest('hex');
  }
}
