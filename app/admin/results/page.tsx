import { desc } from 'drizzle-orm'
import { DatabaseZap } from 'lucide-react'
import { db } from '@/lib/db'
import { testResults } from '@/lib/db/schema'
import { Button } from '@/components/ui/button'
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

  // Запрос к БД оборачиваем в try/catch: при «холодном старте» Neon (база
  // просыпается из спящего режима) первый запрос может временно упасть.
  // Показываем понятное сообщение с кнопкой обновления вместо краша всей страницы.
  try {
    const results = await db
      .select()
      .from(testResults)
      .orderBy(desc(testResults.createdAt))

    return <ResultsTable results={results} accessKey={requiredKey} />
  } catch (error) {
    console.log('[v0] admin results DB error:', error instanceof Error ? error.message : error)
    return <DbErrorNotice />
  }
}

/**
 * Дружелюбная заглушка на случай временной недоступности базы (например,
 * Neon ещё «просыпается» после простоя). Кнопка просто перезагружает страницу.
 */
function DbErrorNotice() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 md:p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 mb-4">
          <DatabaseZap className="h-6 w-6 text-destructive" />
        </div>
        <h1 className="text-xl font-bold mb-1">База данных недоступна</h1>
        <p className="text-sm text-muted-foreground mb-5 text-pretty">
          Не удалось загрузить результаты — возможно, база данных только что
          вышла из спящего режима. Подождите пару секунд и обновите страницу.
        </p>
        <form>
          <Button type="submit" className="w-full">
            Обновить
          </Button>
        </form>
      </div>
    </div>
  )
}
