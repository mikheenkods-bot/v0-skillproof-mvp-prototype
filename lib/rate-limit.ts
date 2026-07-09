import 'server-only'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { headers } from 'next/headers'

/**
 * Durable, DB-backed fixed-window rate limiter.
 *
 * Why the DB and not memory: serverless functions cold-start constantly, and an
 * in-process counter resets with them — useless against brute force on a 4-digit
 * PIN (only 10 000 combinations). One row per (key, window) with an atomic
 * INSERT ... ON CONFLICT keeps the count consistent across all instances.
 */

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

/** Best-effort client IP from proxy headers. */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]!.trim()
  return h.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * Atomically increments the counter for `key` in the current fixed window.
 * Returns whether the request is allowed and, if not, when to retry.
 *
 * Fails OPEN on database errors so a transient DB hiccup can't lock everyone
 * out — brute-force protection degrades gracefully rather than becoming a DoS.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const resetAt = new Date(now + windowSeconds * 1000)

  try {
    // Upsert: if the existing window has expired, reset count+window; otherwise
    // increment. Done in a single statement so concurrent calls stay correct.
    const rows = (await db.execute(sql`
      INSERT INTO rate_limits (bucket_key, count, reset_at, updated_at)
      VALUES (${key}, 1, ${resetAt.toISOString()}, now())
      ON CONFLICT (bucket_key) DO UPDATE SET
        count = CASE
          WHEN rate_limits.reset_at < now() THEN 1
          ELSE rate_limits.count + 1
        END,
        reset_at = CASE
          WHEN rate_limits.reset_at < now() THEN ${resetAt.toISOString()}
          ELSE rate_limits.reset_at
        END,
        updated_at = now()
      RETURNING count, reset_at
    `)) as unknown as Array<{ count: number; reset_at: string }>

    const row = rows[0]
    if (!row) return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 }

    const count = Number(row.count)
    const windowResetAt = new Date(row.reset_at).getTime()
    const retryAfterSeconds = Math.max(0, Math.ceil((windowResetAt - now) / 1000))

    if (count > limit) {
      return { ok: false, remaining: 0, retryAfterSeconds }
    }
    return { ok: true, remaining: Math.max(0, limit - count), retryAfterSeconds }
  } catch (error) {
    console.error('[v0] rate-limit check failed (failing open):', error)
    return { ok: true, remaining: limit, retryAfterSeconds: 0 }
  }
}

/**
 * Ensures a minimum elapsed time for an operation, to flatten timing side
 * channels (e.g. "PIN exists" vs "PIN free" must take a comparable time).
 */
export async function withMinimumDuration<T>(
  minMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  const result = await fn()
  const elapsed = Date.now() - start
  if (elapsed < minMs) {
    await new Promise((r) => setTimeout(r, minMs - elapsed))
  }
  return result
}
