import { desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { testResults } from '@/lib/db/schema'
import { KeyGate } from './key-gate'
import { ResultsTable } from './results-table'
import { isAdminAuthenticated } from './auth'

export const dynamic = 'force-dynamic'

export default async function AdminResultsPage() {
  const requiredKey = process.env.RESULTS_API_KEY

  // Fail closed: if no key is configured, nobody gets in.
  // Otherwise require a valid admin session cookie.
  if (!requiredKey || !(await isAdminAuthenticated())) {
    return <KeyGate notConfigured={!requiredKey} />
  }

  const results = await db
    .select()
    .from(testResults)
    .orderBy(desc(testResults.createdAt))

  return <ResultsTable results={results} accessKey={requiredKey} />
}
