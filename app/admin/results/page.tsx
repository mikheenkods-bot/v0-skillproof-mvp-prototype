import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { testResults } from '@/lib/db/schema'
import { KeyGate } from './key-gate'
import { ResultsTable } from './results-table'

export const dynamic = 'force-dynamic'

export default async function AdminResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>
}) {
  const { key } = await searchParams
  const requiredKey = process.env.RESULTS_API_KEY

  // Fail closed: if no key is configured, nobody gets in.
  if (!requiredKey || key !== requiredKey) {
    return <KeyGate invalid={Boolean(key) && key !== requiredKey} />
  }

  const results = await db
    .select()
    .from(testResults)
    .orderBy(desc(testResults.createdAt))

  return <ResultsTable results={results} accessKey={requiredKey} />
}
