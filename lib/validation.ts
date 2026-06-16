/**
 * Shared input validation/sanitization helpers for server actions.
 *
 * React escapes values on render, so the goal here is defense-in-depth:
 * reject malformed input and clamp free-text fields to sane maximum lengths so
 * the database can't be stuffed with oversized payloads.
 */

export const FIELD_LIMITS = {
  name: 120,
  email: 254, // RFC 5321 max
  specialization: 64,
  certificateId: 64,
  comment: 2000,
  attemptId: 100,
} as const

/** Trims and clamps a free-text value. Non-strings / empties become null. */
export function clampText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

/** Basic, conservative email shape check. */
export function isValidEmail(value: string): boolean {
  if (value.length > FIELD_LIMITS.email) return false
  // Single @, non-empty local part, a dot in the domain, no whitespace.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

/** Normalizes an email: trims, lowercases, clamps. Returns null if invalid. */
export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  if (!normalized || !isValidEmail(normalized)) return null
  return normalized
}
