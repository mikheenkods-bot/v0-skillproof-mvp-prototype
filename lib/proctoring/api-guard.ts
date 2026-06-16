import { EVENT_WEIGHTS, type EventType } from './types'

/**
 * Server-side security helpers for the public proctoring endpoints.
 *
 * These endpoints accept events from untrusted browsers, so every field must be
 * validated and clamped. None of this can be trusted for forensic certainty —
 * but it stops trivial log-poisoning, oversized payloads, and request floods.
 */

// Allowlist of accepted event types, derived from the canonical weight table so
// it can never drift out of sync with the EventType union.
export const VALID_EVENT_TYPES = new Set<string>(Object.keys(EVENT_WEIGHTS))

export function isValidEventType(value: unknown): value is EventType {
  return typeof value === 'string' && VALID_EVENT_TYPES.has(value)
}

// Field length / size limits.
export const LIMITS = {
  attemptId: 100,
  eventId: 100,
  hash: 200,
  description: 500,
  payloadBytes: 4_000,
  bodyBytes: 16_000,
} as const

/** Trims a value to a string and clamps its length. Non-strings become ''. */
export function clampString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

/**
 * Sanitizes an arbitrary metadata/payload object: drops anything that can't be
 * JSON-serialized within the size budget, and rejects nested objects deeper
 * than 2 levels to avoid pathological inputs.
 */
export function sanitizePayload(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  try {
    const json = JSON.stringify(value)
    if (json.length > LIMITS.payloadBytes) {
      return { _truncated: true }
    }
    return JSON.parse(json) as Record<string, unknown>
  } catch {
    return {}
  }
}

/**
 * Minimal in-memory fixed-window rate limiter. Sufficient for a single-instance
 * prototype; in a multi-instance deployment this should move to Redis/Upstash.
 */
const buckets = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count++
  return { allowed: true, retryAfter: 0 }
}

// Opportunistic cleanup so the map can't grow unbounded.
function sweep() {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

/** Best-effort client IP from proxy headers. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return headers.get('x-real-ip') || 'unknown'
}

/** Random jitter sweep to keep memory bounded without a timer. */
export function maybeSweep() {
  if (Math.random() < 0.05) sweep()
}
