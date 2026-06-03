import { NextRequest, NextResponse } from 'next/server'
import { ProctoringEvent, EVENT_WEIGHTS } from '@/lib/proctoring/types'

// In-memory storage for demo purposes
// In production, use a proper database (Neon, Supabase, etc.)
const sessionsStore = new Map<string, {
  events: ProctoringEvent[]
  lastHeartbeat: number
  integrityScore: number
  integrityLevel: 'green' | 'yellow' | 'red'
}>()

export async function POST(request: NextRequest) {
  try {
    const event: ProctoringEvent = await request.json()
    
    if (!event.attemptId || !event.eventType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Get or create session
    let session = sessionsStore.get(event.attemptId)
    if (!session) {
      session = {
        events: [],
        lastHeartbeat: Date.now(),
        integrityScore: 0,
        integrityLevel: 'green'
      }
      sessionsStore.set(event.attemptId, session)
    }
    
    // Verify hash chain integrity (optional but recommended)
    if (session.events.length > 0) {
      const lastEvent = session.events[session.events.length - 1]
      if (event.previousHash !== lastEvent.currentHash) {
        console.warn('Hash chain mismatch detected for attempt:', event.attemptId)
        // Log but don't reject - could be race condition
      }
    }
    
    // Add event to session
    session.events.push(event)
    
    // Recalculate integrity score on server
    let totalPenalty = 0
    for (const e of session.events) {
      totalPenalty += EVENT_WEIGHTS[e.eventType] || 0
    }
    session.integrityScore = Math.min(100, totalPenalty)
    
    if (session.integrityScore > 70) {
      session.integrityLevel = 'red'
    } else if (session.integrityScore > 30) {
      session.integrityLevel = 'yellow'
    } else {
      session.integrityLevel = 'green'
    }
    
    return NextResponse.json({
      success: true,
      eventId: event.id,
      integrityScore: session.integrityScore,
      integrityLevel: session.integrityLevel,
      totalEvents: session.events.length
    })
    
  } catch (error) {
    console.error('Error processing proctoring event:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const attemptId = request.nextUrl.searchParams.get('attemptId')
  
  if (!attemptId) {
    return NextResponse.json(
      { error: 'Missing attemptId parameter' },
      { status: 400 }
    )
  }
  
  const session = sessionsStore.get(attemptId)
  
  if (!session) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    )
  }
  
  return NextResponse.json({
    attemptId,
    events: session.events,
    integrityScore: session.integrityScore,
    integrityLevel: session.integrityLevel,
    lastHeartbeat: session.lastHeartbeat,
    totalEvents: session.events.length
  })
}
