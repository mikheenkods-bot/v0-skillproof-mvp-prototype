import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/app/admin/results/auth'
import { clampString, rateLimit, clientIp, maybeSweep, LIMITS } from '@/lib/proctoring/api-guard'

// In-memory storage for heartbeats.
// In production, use Redis or similar for real-time tracking across instances.
const heartbeatStore = new Map<string, {
  lastHeartbeat: number
  missedCount: number
  integrityScore: number
}>()

const HEARTBEAT_TIMEOUT = 15000 // 15 seconds

export async function POST(request: NextRequest) {
  maybeSweep()
  try {
    const raw = await request.text()
    if (raw.length > LIMITS.bodyBytes) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }

    let body: Record<string, unknown>
    try {
      body = JSON.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const attemptId = clampString(body.attemptId, LIMITS.attemptId)
    if (!attemptId) {
      return NextResponse.json({ error: 'Missing or invalid attemptId' }, { status: 400 })
    }

    // Rate limit: heartbeats arrive ~every 10s, so 30/min per attempt is generous.
    const ip = clientIp(request.headers)
    const perAttempt = rateLimit(`hb:attempt:${attemptId}`, 30, 60_000)
    const perIp = rateLimit(`hb:ip:${ip}`, 120, 60_000)
    if (!perAttempt.allowed || !perIp.allowed) {
      const retryAfter = Math.max(perAttempt.retryAfter, perIp.retryAfter)
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    // Clamp the advisory integrity score to a sane range.
    const rawScore = Number(body.integrityScore)
    const reportedScore = Number.isFinite(rawScore)
      ? Math.min(100, Math.max(0, Math.round(rawScore)))
      : 0

    const now = Date.now()
    let data = heartbeatStore.get(attemptId)

    if (!data) {
      data = { lastHeartbeat: now, missedCount: 0, integrityScore: reportedScore }
    } else {
      const timeSinceLast = now - data.lastHeartbeat
      if (timeSinceLast > HEARTBEAT_TIMEOUT * 2) {
        data.missedCount++
      }
      data.lastHeartbeat = now
      data.integrityScore = reportedScore || data.integrityScore
    }

    heartbeatStore.set(attemptId, data)

    return NextResponse.json({
      success: true,
      timestamp: now,
      missedCount: data.missedCount,
      serverIntegrityScore: data.integrityScore,
    })
  } catch (error) {
    console.error('[v0] Error processing heartbeat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Heartbeat status for an attempt — gated behind the admin session cookie or
 * RESULTS_API_KEY, since it exposes per-attempt monitoring data.
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

  const data = heartbeatStore.get(attemptId)
  if (!data) {
    return NextResponse.json({ error: 'No heartbeat data found' }, { status: 404 })
  }

  const now = Date.now()
  const isAlive = (now - data.lastHeartbeat) < HEARTBEAT_TIMEOUT * 2

  return NextResponse.json({
    attemptId,
    lastHeartbeat: data.lastHeartbeat,
    missedCount: data.missedCount,
    integrityScore: data.integrityScore,
    isAlive,
    secondsSinceLastBeat: Math.round((now - data.lastHeartbeat) / 1000),
  })
}
