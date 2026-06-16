'use server'

import { db } from '@/lib/db'
import { analyticsEvents, type NewAnalyticsEventRow } from '@/lib/db/schema'

export type AnalyticsEventType =
  | 'visit'
  | 'test_started'
  | 'test_completed'
  | 'test_abandoned'

/**
 * Records a single funnel event. Fire-and-forget from the client — failures
 * are swallowed so analytics never block or break the candidate's flow.
 */
export async function trackEvent(
  eventType: AnalyticsEventType,
  data: {
    attemptId?: string | null
    email?: string | null
    specialization?: string | null
    payload?: Record<string, unknown>
  } = {}
) {
  try {
    const row: NewAnalyticsEventRow = {
      eventType,
      attemptId: data.attemptId ?? null,
      email: data.email?.trim().toLowerCase() || null,
      specialization: data.specialization ?? null,
      payload: data.payload ?? {},
    }
    await db.insert(analyticsEvents).values(row)
    return { success: true }
  } catch (error) {
    console.error('[v0] Failed to track analytics event:', error)
    return { success: false }
  }
}
