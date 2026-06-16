'use server'

import { db } from '@/lib/db'
import { feedback, type NewFeedbackRow } from '@/lib/db/schema'
import { clampText, normalizeEmail, FIELD_LIMITS } from '@/lib/validation'

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

  try {
    const row: NewFeedbackRow = {
      certificateId: clampText(input.certificateId, FIELD_LIMITS.certificateId),
      candidateEmail: normalizeEmail(input.candidateEmail),
      candidateName: clampText(input.candidateName, FIELD_LIMITS.name),
      specialization: clampText(input.specialization, FIELD_LIMITS.specialization),
      rating,
      comment: clampText(input.comment, FIELD_LIMITS.comment),
    }
    await db.insert(feedback).values(row)
    return { success: true }
  } catch (error) {
    console.error('[v0] Failed to save feedback:', error)
    return { success: false, error: 'Не удалось сохранить отзыв' }
  }
}
