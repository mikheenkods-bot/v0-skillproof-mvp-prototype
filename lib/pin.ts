import 'server-only'
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { appSecrets } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Anonymous 4-digit PIN system.
 *
 * A PIN replaces all personal data (name / email). It is NEVER stored in clear:
 *   - pin_lookup = HMAC-SHA256(pin, pepper) in hex — a deterministic, keyed
 *     digest used for uniqueness + lookups (bcrypt can't be searched).
 *   - pin_hash   = bcrypt(pin)                     — used to verify a PIN on
 *     re-entry without ever revealing it.
 *
 * The pepper is resolved in this order:
 *   1. SERVER_PEPPER env var (>= 16 chars) — preferred, kept outside the DB.
 *   2. A strong secret auto-generated ONCE and persisted in `app_secrets`, then
 *      reused forever. This makes PIN operations work out of the box in every
 *      environment without manual env-var setup.
 *
 * We still FAIL CLOSED if neither source yields a usable pepper (e.g. the DB is
 * unreachable), because an unkeyed digest would let anyone who reads the DB
 * brute-force all 10 000 PINs offline.
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

const MIN_PEPPER_LENGTH = 16
const PEPPER_SECRET_KEY = 'pin_pepper'

// Process-level cache so we hit the DB at most once per warm instance.
let cachedPepper: string | null = null

/**
 * Resolves the active pepper: env var first, otherwise a durable DB-stored
 * secret that is generated exactly once and shared across all instances.
 * Concurrent cold starts are race-safe via an idempotent upsert + re-read.
 */
async function resolvePepper(): Promise<string> {
  const envPepper = process.env.SERVER_PEPPER
  if (envPepper && envPepper.length >= MIN_PEPPER_LENGTH) {
    return envPepper
  }

  if (cachedPepper) return cachedPepper

  // Read an already-generated secret if present.
  const existing = await db
    .select({ value: appSecrets.value })
    .from(appSecrets)
    .where(eq(appSecrets.key, PEPPER_SECRET_KEY))
    .limit(1)

  if (existing.length > 0 && existing[0].value.length >= MIN_PEPPER_LENGTH) {
    cachedPepper = existing[0].value
    return cachedPepper
  }

  // Generate once and persist. onConflictDoNothing keeps the first writer's
  // value if two instances race, so every instance converges on one secret.
  const generated = randomBytes(48).toString('base64url')
  await db
    .insert(appSecrets)
    .values({ key: PEPPER_SECRET_KEY, value: generated })
    .onConflictDoNothing()

  // Re-read the authoritative row (may be another instance's value).
  const row = await db
    .select({ value: appSecrets.value })
    .from(appSecrets)
    .where(eq(appSecrets.key, PEPPER_SECRET_KEY))
    .limit(1)

  if (row.length === 0 || row[0].value.length < MIN_PEPPER_LENGTH) {
    // Fail closed: never fall back to an unkeyed or weak digest.
    throw new Error('Unable to resolve a secure PIN pepper; PIN operations are disabled.')
  }

  cachedPepper = row[0].value
  return cachedPepper
}

/** Deterministic keyed lookup key. Safe to store and index; not reversible. */
export async function computePinLookup(pin: string): Promise<string> {
  if (!isValidPinFormat(pin)) throw new Error('Invalid PIN format')
  const pepper = await resolvePepper()
  return createHmac('sha256', pepper).update(pin).digest('hex')
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
