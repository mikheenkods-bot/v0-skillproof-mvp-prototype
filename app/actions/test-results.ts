'use server'

import { db } from '@/lib/db'
import { testResults, type NewTestResult } from '@/lib/db/schema'
import { eq, desc, sql } from 'drizzle-orm'

export async function saveTestResult(result: NewTestResult) {
  try {
    const [saved] = await db
      .insert(testResults)
      .values(result)
      .onConflictDoNothing({ target: testResults.certificateId })
      .returning()
    return { success: true, data: saved }
  } catch (error) {
    console.error('[v0] Failed to save test result:', error)
    return { success: false, error: 'Не удалось сохранить результат теста' }
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
