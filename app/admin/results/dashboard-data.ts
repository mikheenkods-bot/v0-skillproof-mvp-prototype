import { desc, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  testResults,
  proctoringEvents,
  analyticsEvents,
  feedback,
  type TestResult,
  type FeedbackRow,
} from '@/lib/db/schema'
import { EVENT_WEIGHTS } from '@/lib/proctoring/types'

export interface FunnelStats {
  visits: number
  started: number
  completed: number
  abandoned: number
  /** Зашли на сайт, но не приступили к тесту. */
  notStarted: number
  /** Приступили, но не завершили (по событиям воронки). */
  notCompleted: number
}

export interface ViolationStat {
  eventType: string
  label: string
  count: number
  weight: number
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface FeedbackStats {
  total: number
  averageRating: number
  /** Распределение оценок: индекс 0 => 1 звезда ... индекс 4 => 5 звёзд. */
  distribution: [number, number, number, number, number]
  items: FeedbackRow[]
}

export interface DashboardData {
  results: TestResult[]
  funnel: FunnelStats
  violations: ViolationStat[]
  totalViolations: number
  attemptsWithViolations: number
  feedback: FeedbackStats
}

// Человекочитаемые названия событий прокторинга для администратора.
const EVENT_LABELS: Record<string, string> = {
  fullscreen_exit: 'Выход из полноэкранного режима',
  tab_hidden: 'Переключение вкладки / сворачивание',
  focus_lost: 'Потеря фокуса окна',
  window_resize: 'Изменение размера окна',
  multi_monitor_detected: 'Обнаружено несколько мониторов',
  devtools_detected: 'Открыты инструменты разработчика',
  copy_attempt: 'Попытка копирования',
  paste_attempt: 'Попытка вставки',
  paste_detected: 'Обнаружена вставка текста',
  cut_attempt: 'Попытка вырезания',
  context_menu: 'Вызов контекстного меню',
  typing_burst: 'Резкий ввод текста (вставка?)',
  suspicious_input: 'Подозрительный ввод',
  suspicious_timing: 'Подозрительный тайминг ответов',
  heartbeat_missed: 'Пропущен сигнал активности',
  browser_check_failed: 'Не пройдена проверка браузера',
  headless_detected: 'Обнаружен автоматизированный браузер',
}

function severityForWeight(weight: number): ViolationStat['severity'] {
  if (weight >= 50) return 'critical'
  if (weight >= 20) return 'high'
  if (weight >= 10) return 'medium'
  return 'low'
}

/**
 * Собирает все данные для дашборда администратора одним проходом:
 * результаты, воронку прохождения, разбивку нарушений прокторинга и отзывы.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [results, funnelRows, violationRows, feedbackItems] = await Promise.all([
    db.select().from(testResults).orderBy(desc(testResults.createdAt)),
    // Считаем уникальные заходы по типам событий воронки.
    db
      .select({
        eventType: analyticsEvents.eventType,
        count: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .groupBy(analyticsEvents.eventType),
    // Разбивка нарушений прокторинга по типам событий.
    db
      .select({
        eventType: proctoringEvents.eventType,
        count: sql<number>`count(*)::int`,
        attempts: sql<number>`count(distinct ${proctoringEvents.attemptId})::int`,
      })
      .from(proctoringEvents)
      .groupBy(proctoringEvents.eventType),
    db.select().from(feedback).orderBy(desc(feedback.createdAt)),
  ])

  // --- Воронка ---
  const counts: Record<string, number> = {}
  for (const row of funnelRows) counts[row.eventType] = Number(row.count)
  const visits = counts['visit'] ?? 0
  const started = counts['test_started'] ?? 0
  const completed = counts['test_completed'] ?? 0
  const abandoned = counts['test_abandoned'] ?? 0
  const funnel: FunnelStats = {
    visits,
    started,
    completed,
    abandoned,
    notStarted: Math.max(visits - started, 0),
    notCompleted: Math.max(started - completed, 0),
  }

  // --- Нарушения прокторинга ---
  // Учитываем только события, у которых вес > 0 (т.е. реальные нарушения,
  // а не служебные heartbeat/session_start и т.п.).
  const violations: ViolationStat[] = violationRows
    .map((row) => {
      const weight = EVENT_WEIGHTS[row.eventType as keyof typeof EVENT_WEIGHTS] ?? 0
      return {
        eventType: row.eventType,
        label: EVENT_LABELS[row.eventType] ?? row.eventType,
        count: Number(row.count),
        weight,
        severity: severityForWeight(weight),
      }
    })
    .filter((v) => v.weight > 0)
    .sort((a, b) => b.count - a.count)

  const totalViolations = violations.reduce((sum, v) => sum + v.count, 0)
  const attemptsWithViolations = violationRows.reduce(
    (max, row) =>
      (EVENT_WEIGHTS[row.eventType as keyof typeof EVENT_WEIGHTS] ?? 0) > 0
        ? Math.max(max, Number(row.attempts))
        : max,
    0
  )

  // --- Отзывы ---
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  let ratingSum = 0
  for (const f of feedbackItems) {
    const r = Math.min(Math.max(f.rating, 1), 5)
    distribution[r - 1] += 1
    ratingSum += r
  }
  const feedbackStats: FeedbackStats = {
    total: feedbackItems.length,
    averageRating: feedbackItems.length ? ratingSum / feedbackItems.length : 0,
    distribution,
    items: feedbackItems,
  }

  return {
    results,
    funnel,
    violations,
    totalViolations,
    attemptsWithViolations,
    feedback: feedbackStats,
  }
}
