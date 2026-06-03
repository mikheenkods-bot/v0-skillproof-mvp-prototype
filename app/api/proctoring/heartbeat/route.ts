import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for heartbeats
// In production, use Redis or similar for real-time tracking
const heartbeatStore = new Map<string, {
  lastHeartbeat: number
  missedCount: number
  integrityScore: number
}>()

const HEARTBEAT_TIMEOUT = 15000 // 15 seconds

export async function POST(request: NextRequest) {
  try {
    const { attemptId, timestamp, integrityScore } = await request.json()
    
    if (!attemptId) {
      return NextResponse.json(
        { error: 'Missing attemptId' },
        { status: 400 }
      )
    }
    
    const now = Date.now()
    let data = heartbeatStore.get(attemptId)
    
    if (!data) {
      data = {
        lastHeartbeat: now,
        missedCount: 0,
        integrityScore: integrityScore || 0
      }
    } else {
      // Check if heartbeat was missed (too long since last one)
      const timeSinceLast = now - data.lastHeartbeat
      if (timeSinceLast > HEARTBEAT_TIMEOUT * 2) {
        data.missedCount++
      }
      data.lastHeartbeat = now
      data.integrityScore = integrityScore || data.integrityScore
    }
    
    heartbeatStore.set(attemptId, data)
    
    return NextResponse.json({
      success: true,
      timestamp: now,
      missedCount: data.missedCount,
      serverIntegrityScore: data.integrityScore
    })
    
  } catch (error) {
    console.error('Error processing heartbeat:', error)
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
  
  const data = heartbeatStore.get(attemptId)
  
  if (!data) {
    return NextResponse.json(
      { error: 'No heartbeat data found' },
      { status: 404 }
    )
  }
  
  const now = Date.now()
  const isAlive = (now - data.lastHeartbeat) < HEARTBEAT_TIMEOUT * 2
  
  return NextResponse.json({
    attemptId,
    lastHeartbeat: data.lastHeartbeat,
    missedCount: data.missedCount,
    integrityScore: data.integrityScore,
    isAlive,
    secondsSinceLastBeat: Math.round((now - data.lastHeartbeat) / 1000)
  })
}
