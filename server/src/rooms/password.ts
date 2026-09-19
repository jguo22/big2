import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** A stored room password. The plaintext is never kept or persisted. */
export interface PasswordHash {
  readonly salt: string;
  readonly hash: string;
}

const KEY_LENGTH = 64;

/**
 * Derives a salted hash for a room password.
 *
 * Room passwords are low-stakes, but people reuse passwords, so the snapshot
 * on disk holds a scrypt hash rather than the plaintext.
 *
 * Params:
 *   password: the plaintext the host chose. Must be non-empty.
 * Returns: the salt and derived hash, both hex-encoded.
 */
export function hashPassword(password: string): PasswordHash {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: scryptSync(password, salt, KEY_LENGTH).toString('hex') };
}

/**
 * Checks a candidate password against a stored hash in constant time.
 *
 * Params:
 *   candidate: the plaintext supplied by the joining player.
 *   stored: the hash produced by `hashPassword`.
 * Returns: `true` when the password matches.
 */
export function verifyPassword(candidate: string, stored: PasswordHash): boolean {
  const derived = scryptSync(candidate, stored.salt, KEY_LENGTH);
  const expected = Buffer.from(stored.hash, 'hex');
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
