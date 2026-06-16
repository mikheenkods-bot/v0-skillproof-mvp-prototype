'use server'

import { neon } from '@neondatabase/serverless'
import { db } from '@/lib/db'
import { feedback, type NewFeedbackRow } from '@/lib/db/schema'
import { clampText, normalizeEmail, FIELD_LIMITS } from '@/lib/validation'

// Raw SQL client for idempotent DDL. This project has no migration step, so the
// `feedback` table can be absent on whatever database a deployment connects to
// (e.g. a fresh preview/production Neon branch). Without this, the very first
// feedback submit fails with `relation "feedback" does not exist`, which the UI
// surfaced as «Не удалось отправить отзыв».
const sql = neon(process.env.DATABASE_URL!)

let feedbackTableEnsured = false

/** Creates the feedback table if it doesn't exist. Cheap, idempotent, cached. */
async function ensureFeedbackTable() {
  if (feedbackTableEnsured) return
  await sql`
    CREATE TABLE IF NOT EXISTS feedback (
      id serial PRIMARY KEY,
      certificate_id text,
      candidate_email text,
      candidate_name text,
      specialization text,
      rating integer NOT NULL,
      comment text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `
  feedbackTableEnsured = true
}

function isMissingTableError(error: unknown): boolean {
  // Drizzle wraps the original Postgres error: the user-facing `message` is just
  // "Failed query: ..." while the real cause (code 42P01 / "relation ... does not
  // exist") lives on `error.cause`. Check both, plus the code, to be robust.
  const parts: string[] = []
  let code: string | undefined
  if (error instanceof Error) {
    parts.push(error.message)
    const cause = (error as { cause?: unknown }).cause
    if (cause instanceof Error) {
      parts.push(cause.message)
      code = (cause as { code?: string }).code
    } else if (cause) {
      parts.push(String(cause))
    }
    code = code ?? (error as { code?: string }).code
  } else {
    parts.push(String(error))
  }
  if (code === '42P01') return true
  return /relation .*feedback.* does not exist|undefined_table/i.test(parts.join(' '))
}

/**
 * Stores candidate feedback (1–5 rating + optional comment) submitted from the
 * result screen. Validates the rating range and trims the comment.
 */
export async function submitFeedback(input: {
  certificateId?: string | null
  candidateEmail?: string | null
  candidateName?: string | null
  specialization?: string | null
  rating: number
  comment?: string | null
}) {
  const rating = Math.round(Number(input.rating))
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return { success: false, error: 'Оценка должна быть от 1 до 5' }
  }

  const row: NewFeedbackRow = {
    certificateId: clampText(input.certificateId, FIELD_LIMITS.certificateId),
    candidateEmail: normalizeEmail(input.candidateEmail),
    candidateName: clampText(input.candidateName, FIELD_LIMITS.name),
    specialization: clampText(input.specialization, FIELD_LIMITS.specialization),
    rating,
    comment: clampText(input.comment, FIELD_LIMITS.comment),
  }

  try {
    await db.insert(feedback).values(row)
    return { success: true }
  } catch (error) {
    // Self-heal: if the table is simply missing, create it and retry once.
    if (isMissingTableError(error)) {
      try {
        await ensureFeedbackTable()
        await db.insert(feedback).values(row)
        return { success: true }
      } catch (retryError) {
        console.error('[v0] Failed to save feedback after ensuring table:', retryError)
        return { success: false, error: 'Не удалось сохранить отзыв' }
      }
    }
    console.error('[v0] Failed to save feedback:', error)
    return { success: false, error: 'Не удалось сохранить отзыв' }
  }
}
