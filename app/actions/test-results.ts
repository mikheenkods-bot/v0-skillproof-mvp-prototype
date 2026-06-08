'use server'

import { db } from '@/lib/db'
import { testResults, type NewTestResult } from '@/lib/db/schema'

export async function saveTestResult(result: NewTestResult) {
  try {
    const [saved] = await db
      .insert(testResults)
      .values(result)
      .onConflictDoNothing({ target: testResults.certificateId })
      .returning()
    return { success: true, data: saved }
  } catch (error) {
    console.error('[v0] Failed to save test result:', error)
    return { success: false, error: 'Не удалось сохранить результат теста' }
  }
}
