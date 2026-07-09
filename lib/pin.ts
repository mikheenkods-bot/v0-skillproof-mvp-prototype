import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import bcrypt from 'bcryptjs'

/**
 * Anonymous 4-digit PIN system.
 *
 * A PIN replaces all personal data (name / email). It is NEVER stored in clear:
 *   - pin_lookup = HMAC-SHA256(pin, SERVER_PEPPER) in hex — a deterministic,
 *     keyed digest used for uniqueness + lookups (bcrypt can't be searched).
 *   - pin_hash   = bcrypt(pin)                            — used to verify a PIN
 *     on re-entry without ever revealing it.
 *
 * SERVER_PEPPER is a mandatory server-only secret. Without it we FAIL CLOSED:
 * every operation throws, because computing an unkeyed digest would let anyone
 * who reads the DB brute-force all 10 000 PINs offline.
 */

const PIN_REGEX = /^[0-9]{4}$/
const BCRYPT_ROUNDS = 12

/** Explicit blacklist of trivially guessable PINs. */
const WEAK_PINS = new Set<string>([
  // Repeated digits 0000..9999
  ...Array.from({ length: 10 }, (_, i) => `${i}${i}${i}${i}`),
  // Common ascending / descending / keypad sequences
  '1234', '2345', '3456', '4567', '5678', '6789', '0123',
  '4321', '5432', '6543', '7654', '8765', '9876', '3210',
  '1212', '2121', '1122', '2211', '1313', '6969', '0110', '1001',
  '0007', '1004', '2000', '2020', '2021', '2022', '2023', '2024', '2025',
  '1379', '2580', '0852', // keypad patterns
])

export type PinFormatError = 'format' | 'weak'

/** Returns null if the PIN is acceptable, or an error code otherwise. */
export function checkPin(pin: string): PinFormatError | null {
  if (typeof pin !== 'string' || !PIN_REGEX.test(pin)) return 'format'
  if (WEAK_PINS.has(pin)) return 'weak'
  return null
}

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === 'string' && PIN_REGEX.test(pin)
}

function getPepper(): string {
  const pepper = process.env.SERVER_PEPPER
  if (!pepper || pepper.length < 16) {
    // Fail closed: never fall back to an unkeyed or weak digest.
    throw new Error('SERVER_PEPPER is not configured; PIN operations are disabled.')
  }
  return pepper
}

/** Deterministic keyed lookup key. Safe to store and index; not reversible. */
export function computePinLookup(pin: string): string {
  if (!isValidPinFormat(pin)) throw new Error('Invalid PIN format')
  return createHmac('sha256', getPepper()).update(pin).digest('hex')
}

/** Constant-time comparison of two lookup digests. */
export function pinLookupEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

export async function hashPin(pin: string): Promise<string> {
  if (!isValidPinFormat(pin)) throw new Error('Invalid PIN format')
  return bcrypt.hash(pin, BCRYPT_ROUNDS)
}

export async function verifyPinHash(pin: string, hash: string): Promise<boolean> {
  if (!isValidPinFormat(pin)) return false
  try {
    return await bcrypt.compare(pin, hash)
  } catch {
    return false
  }
}

/** Generates N random non-weak candidate PINs (used to suggest free codes). */
export function generateCandidatePins(count: number): string[] {
  const out = new Set<string>()
  let guard = 0
  while (out.size < count && guard < count * 50) {
    guard++
    const pin = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    if (!checkPin(pin)) out.add(pin)
  }
  return [...out]
}
