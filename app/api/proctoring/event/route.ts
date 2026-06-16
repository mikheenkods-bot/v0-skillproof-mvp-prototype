import { NextRequest, NextResponse } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { proctoringEvents } from '@/lib/db/schema'
import { EVENT_WEIGHTS, EventType, INTEGRITY_THRESHOLDS } from '@/lib/proctoring/types'
import { isAdminAuthenticated } from '@/app/admin/results/auth'
import {
  isValidEventType,
  clampString,
  sanitizePayload,
  rateLimit,
  clientIp,
  maybeSweep,
  LIMITS,
} from '@/lib/proctoring/api-guard'

function levelFor(score: number): 'green' | 'yellow' | 'red' {
  if (score > INTEGRITY_THRESHOLDS.yellow) return 'red'
  if (score > INTEGRITY_THRESHOLDS.green) return 'yellow'
  return 'green'
}

/**
 * Persists a proctoring event to the database (durable — survives restarts)
 * and recomputes the integrity score server-side from ALL stored events for
 * the attempt. This is the authoritative score; the client value is advisory.
 *
 * Hardening (untrusted input):
 *  - eventType must be in the allowlist;
 *  - per-attempt + per-IP rate limiting;
 *  - request body and string fields are size-clamped;
 *  - payload is sanitized before storage.
 */
export async function POST(request: NextRequest) {
  maybeSweep()
  try {
    // Reject oversized bodies before parsing.
    const raw = await request.text()
    if (raw.length > LIMITS.bodyBytes) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    let event: Record<string, unknown>
    try {
      event = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const attemptId = clampString(event.attemptId, LIMITS.attemptId)
    if (!attemptId) {
      return NextResponse.json({ error: 'Missing or invalid attemptId' }, { status: 400 })
    }

    // Only accept allowlisted event types — reject anything else outright.
    if (!isValidEventType(event.eventType)) {
      return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 })
    }
    const eventType = event.eventType as EventType

    // Rate limit per attempt and per IP (fixed window).
    const ip = clientIp(request.headers)
    const perAttempt = rateLimit(`evt:attempt:${attemptId}`, 120, 60_000)
    const perIp = rateLimit(`evt:ip:${ip}`, 300, 60_000)
    if (!perAttempt.allowed || !perIp.allowed) {
      const retryAfter = Math.max(perAttempt.retryAfter, perIp.retryAfter)
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Optional hash-chain check against the previously stored event.
    const prior = await db
      .select()
      .from(proctoringEvents)
      .where(eq(proctoringEvents.attemptId, attemptId))
      .orderBy(asc(proctoringEvents.id))

    const previousHash = clampString(event.previousHash, LIMITS.hash)
    if (prior.length > 0) {
      const last = prior[prior.length - 1]
      if (previousHash && last.currentHash && previousHash !== last.currentHash) {
        console.warn('[v0] Hash chain mismatch for attempt:', attemptId)
        // Log but don't reject — could be a benign race condition.
      }
    }

    const ts = Number(event.timestamp)

    await db.insert(proctoringEvents).values({
      attemptId,
      certificateId: clampString(event.certificateId, LIMITS.attemptId),
      eventId: clampString(event.id, LIMITS.eventId),
      eventType,
      description: clampString(event.description, LIMITS.description),
      timestamp: Number.isFinite(ts) ? ts : null,
      previousHash,
      currentHash: clampString(event.currentHash, LIMITS.hash),
      payload: sanitizePayload(event.metadata),
    })

    // Recalculate integrity from the full durable history (server-authoritative).
    let totalPenalty = 0
    for (const e of prior) {
      totalPenalty += EVENT_WEIGHTS[e.eventType as EventType] || 0
    }
    totalPenalty += EVENT_WEIGHTS[eventType] || 0
    const integrityScore = Math.min(100, totalPenalty)

    return NextResponse.json({
      success: true,
      integrityScore,
      integrityLevel: levelFor(integrityScore),
      totalEvents: prior.length + 1,
    })
  } catch (error) {
    console.error('[v0] Error processing proctoring event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Returns the full event log for an attempt. This is sensitive forensic data,
 * so it is gated behind the admin session cookie OR the RESULTS_API_KEY (same
 * contract as /api/results). It is NOT public.
 */
export async function GET(request: NextRequest) {
  const requiredKey = process.env.RESULTS_API_KEY
  if (!requiredKey) {
    return NextResponse.json({ error: 'API not configured' }, { status: 503 })
  }

  const providedKey =
    request.headers.get('x-api-key') || request.nextUrl.searchParams.get('api_key')
  const authorized = providedKey === requiredKey || (await isAdminAuthenticated())
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const attemptId = clampString(
    request.nextUrl.searchParams.get('attemptId'),
    LIMITS.attemptId
  )
  if (!attemptId) {
    return NextResponse.json({ error: 'Missing attemptId parameter' }, { status: 400 })
  }

  try {
    const events = await db
      .select()
      .from(proctoringEvents)
      .where(eq(proctoringEvents.attemptId, attemptId))
      .orderBy(asc(proctoringEvents.id))

    if (events.length === 0) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    let totalPenalty = 0
    for (const e of events) {
      totalPenalty += EVENT_WEIGHTS[e.eventType as EventType] || 0
    }
    const integrityScore = Math.min(100, totalPenalty)

    return NextResponse.json({
      attemptId,
      events,
      integrityScore,
      integrityLevel: levelFor(integrityScore),
      totalEvents: events.length,
    })
  } catch (error) {
    console.error('[v0] Error reading proctoring events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
