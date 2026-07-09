'use server'

import { db } from '@/lib/db'
import { candidates, testResults } from '@/lib/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'
import {
  checkPin,
  computePinLookup,
  generateCandidatePins,
  hashPin,
} from '@/lib/pin'
import { rateLimit, getClientIp, withMinimumDuration } from '@/lib/rate-limit'

// Uniform minimum response time to flatten timing side-channels between
// "PIN exists" and "PIN free" / "found" and "not found".
const MIN_RESPONSE_MS = 400

export interface RegisterPinResult {
  success: boolean
  /** Generic, non-enumerating error message for the UI. */
  error?: string
  /** When the PIN is taken, a few free alternatives to suggest. */
  suggestions?: string[]
  /** Set when rate-limited. */
  retryAfterSeconds?: number
}

/**
 * Registers a new anonymous PIN. Relies on the UNIQUE constraint on pin_lookup
 * as the single source of truth (INSERT ... ON CONFLICT DO NOTHING) — no
 * check-then-insert race. Never stores the PIN in clear.
 */
export async function registerPin(pin: string): Promise<RegisterPinResult> {
  return withMinimumDuration(MIN_RESPONSE_MS, async () => {
    const ip = await getClientIp()
    const rl = await rateLimit(`pin:register:${ip}`, 5, 600)
    if (!rl.ok) {
      return {
        success: false,
        error: 'Слишком много попыток. Повторите позже.',
        retryAfterSeconds: rl.retryAfterSeconds,
      }
    }

    const problem = checkPin(pin)
    if (problem === 'format') {
      return { success: false, error: 'Код должен состоять ровно из 4 цифр.' }
    }
    if (problem === 'weak') {
      return {
        success: false,
        error: 'Слишком простой код. Придумайте менее очевидный.',
        suggestions: await findFreePins(3),
      }
    }

    let lookup: string
    let hash: string
    try {
      lookup = computePinLookup(pin)
      hash = await hashPin(pin)
    } catch (error) {
      // SERVER_PEPPER missing -> fail closed.
      console.error('[v0] PIN registration disabled:', (error as Error).message)
      return { success: false, error: 'Сервис временно недоступен. Попробуйте позже.' }
    }

    try {
      const inserted = await db
        .insert(candidates)
        .values({ pinHash: hash, pinLookup: lookup })
        .onConflictDoNothing({ target: candidates.pinLookup })
        .returning({ id: candidates.id })

      if (inserted.length === 0) {
        // UNIQUE conflict => PIN already taken.
        return {
          success: false,
          error: 'Этот код уже занят, придумайте другой.',
          suggestions: await findFreePins(3),
        }
      }
      return { success: true }
    } catch (error) {
      console.error('[v0] PIN registration failed:', error)
      return { success: false, error: 'Не удалось зарегистрировать код. Попробуйте ещё раз.' }
    }
  })
}

/** Returns up to `count` PINs that are currently free (one DB round-trip). */
async function findFreePins(count: number): Promise<string[]> {
  try {
    const candidatesToTry = generateCandidatePins(count * 3)
    const lookups = candidatesToTry.map((p) => ({ pin: p, lookup: computePinLookup(p) }))
    const taken = await db
      .select({ pinLookup: candidates.pinLookup })
      .from(candidates)
      .where(sql`${candidates.pinLookup} = ANY(${lookups.map((l) => l.lookup)})`)
    const takenSet = new Set(taken.map((t) => t.pinLookup))
    return lookups
      .filter((l) => !takenSet.has(l.lookup))
      .slice(0, count)
      .map((l) => l.pin)
  } catch {
    return []
  }
}

export interface ExistingCompletion {
  completed: boolean
  attempts: number
  certificateId: string | null
  specialization: string | null
  score: number | null
  passed: boolean | null
  completedAt: string | null
}

const EMPTY_COMPLETION: ExistingCompletion = {
  completed: false,
  attempts: 0,
  certificateId: null,
  specialization: null,
  score: null,
  passed: null,
  completedAt: null,
}

/**
 * Retake gate: how many attempts this PIN already has and its best result.
 * Fails OPEN on error so a DB hiccup never blocks a legitimate candidate.
 */
export async function getCompletionByPin(pin: string): Promise<ExistingCompletion> {
  const problem = checkPin(pin)
  if (problem === 'format') return EMPTY_COMPLETION

  let lookup: string
  try {
    lookup = computePinLookup(pin)
  } catch {
    return EMPTY_COMPLETION
  }

  try {
    const ip = await getClientIp()
    const rl = await rateLimit(`pin:gate:${ip}`, 10, 600)
    if (!rl.ok) return EMPTY_COMPLETION

    const rows = await db
      .select()
      .from(testResults)
      .where(eq(testResults.pinLookup, lookup))
      .orderBy(desc(testResults.createdAt))

    if (rows.length === 0) return EMPTY_COMPLETION

    const best = rows.find((r) => r.passed) ?? rows[0]
    return {
      completed: true,
      attempts: rows.length,
      certificateId: best.certificateId,
      specialization: best.specialization,
      score: best.score,
      passed: best.passed,
      completedAt: best.createdAt ? new Date(best.createdAt).toISOString() : null,
    }
  } catch (error) {
    console.error('[v0] getCompletionByPin failed (failing open):', error)
    return EMPTY_COMPLETION
  }
}

export interface RecoveredCertificate {
  certificateId: string
  specialization: string
  score: number
  isClean: boolean
  issuedAt: string | null
}

export interface RecoverCertificatesResult {
  /** Always present; empty array means "nothing to show" (neutral message). */
  certificates: RecoveredCertificate[]
  retryAfterSeconds?: number
}

/**
 * Certificate recovery by PIN. Returns ONLY non-sensitive fields of PASSED
 * results. The response is intentionally identical for "PIN doesn't exist" and
 * "PIN exists but hasn't passed" (both -> empty list), so it can't be used to
 * confirm whether a PIN exists. Rate-limited against brute force.
 */
export async function getCertificatesByPin(pin: string): Promise<RecoverCertificatesResult> {
  return withMinimumDuration(MIN_RESPONSE_MS, async () => {
    const ip = await getClientIp()
    const rl = await rateLimit(`pin:recover:${ip}`, 5, 600)
    if (!rl.ok) {
      return { certificates: [], retryAfterSeconds: rl.retryAfterSeconds }
    }

    const problem = checkPin(pin)
    if (problem === 'format') return { certificates: [] }

    let lookup: string
    try {
      lookup = computePinLookup(pin)
    } catch {
      return { certificates: [] }
    }

    try {
      const rows = await db
        .select({
          certificateId: testResults.certificateId,
          specialization: testResults.specialization,
          score: testResults.score,
          isClean: testResults.isClean,
          createdAt: testResults.createdAt,
        })
        .from(testResults)
        .where(and(eq(testResults.pinLookup, lookup), eq(testResults.passed, true)))
        .orderBy(desc(testResults.createdAt))

      return {
        certificates: rows.map((r) => ({
          certificateId: r.certificateId,
          specialization: r.specialization,
          score: r.score,
          isClean: r.isClean,
          issuedAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        })),
      }
    } catch (error) {
      console.error('[v0] getCertificatesByPin failed:', error)
      return { certificates: [] }
    }
  })
}
