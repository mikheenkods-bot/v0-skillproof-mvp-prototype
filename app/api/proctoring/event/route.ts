import { NextRequest, NextResponse } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { proctoringEvents } from '@/lib/db/schema'
import { ProctoringEvent, EVENT_WEIGHTS, EventType, INTEGRITY_THRESHOLDS } from '@/lib/proctoring/types'

function levelFor(score: number): 'green' | 'yellow' | 'red' {
  if (score > INTEGRITY_THRESHOLDS.yellow) return 'red'
  if (score > INTEGRITY_THRESHOLDS.green) return 'yellow'
  return 'green'
}

/**
 * Persists a proctoring event to the database (durable — survives restarts)
 * and recomputes the integrity score server-side from ALL stored events for
 * the attempt. This is the authoritative score; the client value is advisory.
 */
export async function POST(request: NextRequest) {
  try {
    const event: ProctoringEvent & { certificateId?: string } = await request.json()

    if (!event.attemptId || !event.eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Optional hash-chain check against the previously stored event.
    const prior = await db
      .select()
      .from(proctoringEvents)
      .where(eq(proctoringEvents.attemptId, event.attemptId))
      .orderBy(asc(proctoringEvents.id))

    if (prior.length > 0) {
      const last = prior[prior.length - 1]
      if (event.previousHash && last.currentHash && event.previousHash !== last.currentHash) {
        console.warn('[v0] Hash chain mismatch for attempt:', event.attemptId)
        // Log but don't reject — could be a benign race condition.
      }
    }

    await db.insert(proctoringEvents).values({
      attemptId: event.attemptId,
      certificateId: event.certificateId ?? null,
      eventId: event.id ?? null,
      eventType: event.eventType,
      description: event.description ?? null,
      timestamp: typeof event.timestamp === 'number' ? event.timestamp : null,
      previousHash: event.previousHash ?? null,
      currentHash: event.currentHash ?? null,
      payload: event.metadata ?? {},
    })

    // Recalculate integrity from the full durable history.
    let totalPenalty = 0
    for (const e of prior) {
      totalPenalty += EVENT_WEIGHTS[e.eventType as EventType] || 0
    }
    totalPenalty += EVENT_WEIGHTS[event.eventType] || 0
    const integrityScore = Math.min(100, totalPenalty)

    return NextResponse.json({
      success: true,
      eventId: event.id,
      integrityScore,
      integrityLevel: levelFor(integrityScore),
      totalEvents: prior.length + 1,
    })
  } catch (error) {
    console.error('[v0] Error processing proctoring event:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const attemptId = request.nextUrl.searchParams.get('attemptId')

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
