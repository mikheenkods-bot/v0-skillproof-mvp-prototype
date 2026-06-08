import { db } from '@/lib/db'
import { testResults } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

// GET /api/results
// Returns all test results as JSON. Intended for consumption by external systems.
// Protected by an API key: the RESULTS_API_KEY env var MUST be set, and callers
// must provide it via the "x-api-key" header or "?api_key=" query param.
export async function GET(request: Request) {
  const requiredKey = process.env.RESULTS_API_KEY

  // Fail closed: if no key is configured, refuse all access rather than
  // exposing every candidate's results publicly.
  if (!requiredKey) {
    return NextResponse.json(
      { error: 'API not configured. Set the RESULTS_API_KEY environment variable.' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(request.url)
  const providedKey =
    request.headers.get('x-api-key') || searchParams.get('api_key')

  if (providedKey !== requiredKey) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide a valid API key.' },
      { status: 401 }
    )
  }

  try {
    const certificateId = searchParams.get('certificate_id')

    const results = certificateId
      ? await db
          .select()
          .from(testResults)
          .where(eq(testResults.certificateId, certificateId))
      : await db.select().from(testResults).orderBy(desc(testResults.createdAt))

    return NextResponse.json({ count: results.length, results })
  } catch (error) {
    console.error('[v0] Failed to fetch test results:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test results' },
      { status: 500 }
    )
  }
}
