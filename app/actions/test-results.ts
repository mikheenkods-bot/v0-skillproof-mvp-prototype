'use server'

import { db } from '@/lib/db'
import { testResults, type NewTestResult } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { clampText, normalizeEmail, FIELD_LIMITS } from '@/lib/validation'

export async function saveTestResult(result: NewTestResult) {
  try {
    // Clamp candidate-supplied free-text fields before persisting.
    const safe: NewTestResult = {
      ...result,
      candidateName: clampText(result.candidateName, FIELD_LIMITS.name),
      candidateEmail: normalizeEmail(result.candidateEmail),
      specialization:
        clampText(result.specialization, FIELD_LIMITS.specialization) ?? result.specialization,
    }
    const [saved] = await db
      .insert(testResults)
      .values(safe)
      .onConflictDoNothing({ target: testResults.certificateId })
      .returning()
    return { success: true, data: saved }
  } catch (error) {
    console.error('[v0] Failed to save test result:', error)
    return { success: false, error: 'Не удалось сохранить результат теста' }
  }
}

export interface CertificateVerification {
  valid: boolean
  certificateId: string | null
  candidateName: string | null
  specialization: string | null
  score: number | null
  passed: boolean | null
  isClean: boolean | null
  integrityScore: number | null
  issuedAt: string | null
}

/**
 * Public certificate verification by certificateId. Returns only the
 * non-sensitive fields needed to confirm a certificate is genuine —
 * deliberately omits email and the detailed proctoring log to avoid
 * leaking personal data on a public /verify page.
 */
/**
 * Normalizes a scanned/pasted certificate ID before lookup. PDFs, QR readers
 * and messengers frequently substitute the ASCII hyphen "-" with look-alike
 * Unicode dashes (minus sign U+2212, en/em dash, non-breaking hyphen, figure
 * dash). Without this, a perfectly real ID like "SKILL-5M8ZU0" fails to match
 * because the user actually pasted "SKILL−5M8ZU0". We also strip whitespace
 * and uppercase, since IDs are stored uppercased.
 */
function normalizeCertificateId(raw: string): string {
  return raw
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-') // dash look-alikes -> hyphen
    .replace(/\s+/g, '') // remove any stray spaces
    .trim()
    .toUpperCase()
}

export async function getCertificateById(certificateId: string): Promise<CertificateVerification> {
  const id = normalizeCertificateId(certificateId)
  const invalid: CertificateVerification = {
    valid: false,
    certificateId: null,
    candidateName: null,
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
      // Case-insensitive match (IDs are stored uppercased, but be defensive
      // against any historical mixed-case rows).
      .where(eq(sql`upper(${testResults.certificateId})`, id))
      .limit(1)

    // A certificate is only "valid" if it exists AND the candidate passed.
    if (!row || !row.passed) return invalid

    return {
      valid: true,
      certificateId: row.certificateId,
      candidateName: row.candidateName,
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

export interface ExistingCompletion {
  completed: boolean
  attempts: number
  certificateId: string | null
  specialization: string | null
  score: number | null
  passed: boolean | null
  completedAt: string | null
}

/**
 * Checks whether a candidate (identified by email) has already completed
 * the test. This is the authoritative, server-side gate that prevents repeat
 * attempts — and unlike an IP check it can't be bypassed with a VPN, because
 * the identity is the email, not the network address.
 */
export async function getCompletionByEmail(email: string): Promise<ExistingCompletion> {
  const normalized = email.trim().toLowerCase()

  const empty: ExistingCompletion = {
    completed: false,
    attempts: 0,
    certificateId: null,
    specialization: null,
    score: null,
    passed: null,
    completedAt: null,
  }

  if (!normalized) return empty

  try {
    const rows = await db
      .select()
      .from(testResults)
      // Compare case-insensitively so "User@x.com" and "user@x.com" match.
      .where(eq(sql`lower(${testResults.candidateEmail})`, normalized))
      .orderBy(desc(testResults.createdAt))

    if (rows.length === 0) return empty

    // Prefer showing the best (passed) result, otherwise the most recent one.
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
    console.error('[v0] Failed to check existing completion:', error)
    // On error, do not block the candidate — fail open so a DB hiccup
    // doesn't lock everyone out.
    return empty
  }
}
