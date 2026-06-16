'use server'

import { db } from '@/lib/db'
import { feedback, type NewFeedbackRow } from '@/lib/db/schema'

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
      certificateId: input.certificateId?.trim() || null,
      candidateEmail: input.candidateEmail?.trim().toLowerCase() || null,
      candidateName: input.candidateName?.trim() || null,
      specialization: input.specialization?.trim() || null,
      rating,
      comment: input.comment?.trim() || null,
    }
    await db.insert(feedback).values(row)
    return { success: true }
  } catch (error) {
    console.error('[v0] Failed to save feedback:', error)
    return { success: false, error: 'Не удалось сохранить отзыв' }
  }
}
