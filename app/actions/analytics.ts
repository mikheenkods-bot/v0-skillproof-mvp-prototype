'use server'

import { db } from '@/lib/db'
import { analyticsEvents, type NewAnalyticsEventRow } from '@/lib/db/schema'
import { clampText, normalizeEmail, FIELD_LIMITS } from '@/lib/validation'

export type AnalyticsEventType =
  | 'visit'
  | 'test_started'
  | 'test_completed'
  | 'test_abandoned'

const VALID_ANALYTICS_EVENTS = new Set<AnalyticsEventType>([
  'visit',
  'test_started',
  'test_completed',
  'test_abandoned',
])

// Cap the serialized payload so analytics can't be used to stuff the DB.
const MAX_PAYLOAD_BYTES = 2_000

function sanitizePayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {}
  try {
    const json = JSON.stringify(payload)
    if (json.length > MAX_PAYLOAD_BYTES) return { _truncated: true }
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}

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
  // Only accept allowlisted funnel events.
  if (!VALID_ANALYTICS_EVENTS.has(eventType)) {
    return { success: false }
  }

  try {
    const row: NewAnalyticsEventRow = {
      eventType,
      attemptId: clampText(data.attemptId, FIELD_LIMITS.attemptId),
      email: normalizeEmail(data.email),
      specialization: clampText(data.specialization, FIELD_LIMITS.specialization),
      payload: sanitizePayload(data.payload),
    }
    await db.insert(analyticsEvents).values(row)
    return { success: true }
  } catch (error) {
    console.error('[v0] Failed to track analytics event:', error)
    return { success: false }
  }
}
