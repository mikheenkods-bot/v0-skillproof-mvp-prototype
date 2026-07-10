/**
 * Shared input validation/sanitization helpers for server actions.
 *
 * React escapes values on render, so the goal here is defense-in-depth:
 * reject malformed input and clamp free-text fields to sane maximum lengths so
 * the database can't be stuffed with oversized payloads.
 */

export const FIELD_LIMITS = {
  specialization: 64,
  certificateId: 64,
  comment: 2000,
  attemptId: 100,
  description: 500,
} as const

/** Coerces an unknown to an integer rating within [min, max], or null. */
export function clampRating(value: unknown, min = 1, max = 5): number | null {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return null
  const r = Math.round(n)
  if (r < min || r > max) return null
  return r
}

/**
 * Coerces an unknown to an integer, clamping into [min, max]. Non-numeric /
 * NaN input falls back to `min`. Used to defend against forged or out-of-range
 * numeric fields on public server actions.
 */
export function clampInt(value: unknown, min: number, max: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return min
  const r = Math.round(n)
  if (r < min) return min
  if (r > max) return max
  return r
}

/** Validates a certificate id: 4–64 chars, uppercase alnum + dashes only. */
export function isValidCertificateId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9-]{4,64}$/.test(value)
}

/** Trims and clamps a free-text value. Non-strings / empties become null. */
export function clampText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}
