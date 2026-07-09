'use server'

import { db } from '@/lib/db'
import { testResults, candidates, type NewTestResult } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { clampText, FIELD_LIMITS } from '@/lib/validation'
import { checkPin, computePinLookup } from '@/lib/pin'

export interface SaveTestResultInput {
  certificateId: string
  pin: string
  specialization: string
  score: number
  correctAnswers: number
  totalQuestions: number
  passed: boolean
  isClean: boolean
  violations: number
  integrityScore: number
  skills: unknown
  proctoringLog: unknown
}

/**
 * Persists a finished test result, linked to the anonymous candidate via PIN.
 * No personal data is accepted or stored. The PIN is converted server-side to
 * its keyed lookup; the raw PIN is never written anywhere.
 */
export async function saveTestResult(input: SaveTestResultInput) {
  try {
    if (checkPin(input.pin) === 'format') {
      return { success: false, error: 'Некорректный код' }
    }

    let pinLookup: string
    try {
      pinLookup = computePinLookup(input.pin)
    } catch {
      return { success: false, error: 'Сервис временно недоступен' }
    }

    // Resolve (or lazily create) the candidate row for this PIN so the result
    // is always attributable to an anonymous candidate id.
    let candidateId: number | null = null
    const existing = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.pinLookup, pinLookup))
      .limit(1)
    candidateId = existing[0]?.id ?? null

    const row: NewTestResult = {
      certificateId: input.certificateId,
      candidateId,
      pinLookup,
      specialization:
        clampText(input.specialization, FIELD_LIMITS.specialization) ?? input.specialization,
      score: input.score,
      correctAnswers: input.correctAnswers,
      totalQuestions: input.totalQuestions,
      passed: input.passed,
      isClean: input.isClean,
      violations: input.violations,
      integrityScore: input.integrityScore,
      skills: input.skills as NewTestResult['skills'],
      proctoringLog: input.proctoringLog as NewTestResult['proctoringLog'],
    }

    const [saved] = await db
      .insert(testResults)
      .values(row)
      .onConflictDoNothing({ target: testResults.certificateId })
      .returning()

    // Touch last_seen_at for the candidate.
    if (candidateId) {
      await db
        .update(candidates)
        .set({ lastSeenAt: new Date() })
        .where(eq(candidates.id, candidateId))
    }

    return { success: true, data: saved }
  } catch (error) {
    console.error('[v0] Failed to save test result:', error)
    return { success: false, error: 'Не удалось сохранить результат теста' }
  }
}

export interface CertificateVerification {
  valid: boolean
  certificateId: string | null
  /** Anonymous identifier shown publicly instead of a name. */
  candidateLabel: string | null
  specialization: string | null
  score: number | null
  passed: boolean | null
  isClean: boolean | null
  integrityScore: number | null
  issuedAt: string | null
}

/**
 * Normalizes a scanned/pasted certificate ID before lookup. PDFs, QR readers
 * and messengers frequently substitute the ASCII hyphen "-" with look-alike
 * Unicode dashes. We also strip whitespace and uppercase, since IDs are stored
 * uppercased.
 */
function normalizeCertificateId(raw: string): string {
  return raw
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/\s+/g, '')
    .trim()
    .toUpperCase()
}

/** Short, stable anonymous label derived from the certificate id. */
function anonymousLabel(certificateId: string): string {
  const tail = certificateId.replace(/[^A-Z0-9]/gi, '').slice(-4).toUpperCase()
  return `Кандидат #${tail || '0000'}`
}

/**
 * Public certificate verification by certificateId. Returns only non-sensitive
 * fields — no personal data (there is none stored) and no detailed proctoring
 * log — so the public /verify page can confirm authenticity without leaking.
 */
export async function getCertificateById(certificateId: string): Promise<CertificateVerification> {
  const id = normalizeCertificateId(certificateId)
  const invalid: CertificateVerification = {
    valid: false,
    certificateId: null,
    candidateLabel: null,
    specialization: null,
    score: null,
    passed: null,
    isClean: null,
    integrityScore: null,
    issuedAt: null,
  }

  if (!id) return invalid

  try {
    const [row] = await db
      .select()
      .from(testResults)
      .where(eq(sql`upper(${testResults.certificateId})`, id))
      .limit(1)

    if (!row || !row.passed) return invalid

    return {
      valid: true,
      certificateId: row.certificateId,
      candidateLabel: anonymousLabel(row.certificateId),
      specialization: row.specialization,
      score: row.score,
      passed: row.passed,
      isClean: row.isClean,
      integrityScore: row.integrityScore ?? null,
      issuedAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
    }
  } catch (error) {
    console.error('[v0] Failed to verify certificate:', error)
    return invalid
  }
}
