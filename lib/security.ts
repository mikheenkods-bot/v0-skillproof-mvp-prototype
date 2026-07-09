import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Constant-time comparison of two secrets (API keys, session tokens).
 *
 * A naive `a === b` / `a !== b` short-circuits at the first differing byte, so
 * an attacker can measure response time to recover a secret byte-by-byte. We
 * hash both inputs to a fixed 32-byte digest first — this equalizes length so
 * the comparison never leaks the secret's length, and guarantees
 * `timingSafeEqual` gets equal-length buffers (it throws otherwise).
 */
export function safeEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const ah = createHash('sha256').update(a).digest()
  const bh = createHash('sha256').update(b).digest()
  return timingSafeEqual(ah, bh)
}
