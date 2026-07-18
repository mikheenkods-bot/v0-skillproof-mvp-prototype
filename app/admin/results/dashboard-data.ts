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
import { ensureAnalyticsSchema } from '@/lib/db/ensure-analytics-schema'
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

/** Метрики вовлечённости на основе анонимного visitor_id. */
export interface EngagementStats {
  /** Уникальные посетители за сегодня. */
  dau: number
  /** Уникальные посетители за последние 7 дней. */
  wau: number
  /** Уникальные посетители за последние 30 дней. */
  mau: number
  /** «Липкость» аудитории: DAU / MAU в процентах. */
  stickiness: number
  /** Всего уникальных посетителей за всё время. */
  totalVisitors: number
  /** Посетители, заходившие минимум в 2 разных дня (вернувшиеся). */
  returningVisitors: number
  /** Retention: доля вернувшихся от общего числа посетителей, в процентах. */
  retentionRate: number
  /**
   * false, если данных по посетителям ещё нет (например, колонка visitor_id
   * только что создана и события ещё не накопились) — тогда UI показывает
   * поясняющую подсказку вместо нулей.
   */
  available: boolean
}

/** Точка ежедневной активности для графика за последние 14 дней. */
export interface ActivityPoint {
  /** Дата в формате YYYY-MM-DD. */
  date: string
  visits: number
  started: number
  completed: number
}

export interface DashboardData {
  results: TestResult[]
  funnel: FunnelStats
  violations: ViolationStat[]
  totalViolations: number
  attemptsWithViolations: number
  feedback: FeedbackStats
  engagement: EngagementStats
  activity: ActivityPoint[]
}

const EMPTY_ENGAGEMENT: EngagementStats = {
  dau: 0,
  wau: 0,
  mau: 0,
  stickiness: 0,
  totalVisitors: 0,
  returningVisitors: 0,
  retentionRate: 0,
  available: false,
}

/**
 * Считает метрики вовлечённости (DAU/MAU/retention) и ежедневную активность.
 * Изолировано в отдельной функции с try/catch: если колонка visitor_id ещё не
 * создана или база временно недоступна, дашборд всё равно откроется — просто
 * без этих метрик.
 */
async function getEngagementAndActivity(): Promise<{
  engagement: EngagementStats
  activity: ActivityPoint[]
}> {
  try {
    await ensureAnalyticsSchema()

    const [aggRows, returningRes, activityRows] = await Promise.all([
      // Единый проход по таблице для DAU/WAU/MAU и общего числа посетителей.
      db
        .select({
          dau: sql<number>`count(distinct case when ${analyticsEvents.createdAt} >= date_trunc('day', now()) then ${analyticsEvents.visitorId} end)::int`,
          wau: sql<number>`count(distinct case when ${analyticsEvents.createdAt} >= now() - interval '7 days' then ${analyticsEvents.visitorId} end)::int`,
          mau: sql<number>`count(distinct case when ${analyticsEvents.createdAt} >= now() - interval '30 days' then ${analyticsEvents.visitorId} end)::int`,
          total: sql<number>`count(distinct ${analyticsEvents.visitorId})::int`,
        })
        .from(analyticsEvents),
      // Вернувшиеся: посетители, активные минимум в 2 разных календарных дня.
      db.execute(sql`
        select count(*)::int as returning
        from (
          select ${analyticsEvents.visitorId} as vid
          from ${analyticsEvents}
          where ${analyticsEvents.visitorId} is not null
          group by ${analyticsEvents.visitorId}
          having count(distinct date_trunc('day', ${analyticsEvents.createdAt})) >= 2
        ) t
      `),
      // Ежедневная активность по типам событий за последние 14 дней.
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${analyticsEvents.createdAt}), 'YYYY-MM-DD')`,
          eventType: analyticsEvents.eventType,
          count: sql<number>`count(*)::int`,
        })
        .from(analyticsEvents)
        .where(sql`${analyticsEvents.createdAt} >= now() - interval '13 days'`)
        .groupBy(sql`1`, analyticsEvents.eventType),
    ])

    const agg = aggRows[0] ?? { dau: 0, wau: 0, mau: 0, total: 0 }
    const dau = Number(agg.dau ?? 0)
    const wau = Number(agg.wau ?? 0)
    const mau = Number(agg.mau ?? 0)
    const totalVisitors = Number(agg.total ?? 0)
    const returningVisitors = Number(
      (returningRes.rows?.[0] as { returning?: number } | undefined)?.returning ?? 0
    )

    const engagement: EngagementStats = {
      dau,
      wau,
      mau,
      stickiness: mau ? Math.round((dau / mau) * 100) : 0,
      totalVisitors,
      returningVisitors,
      retentionRate: totalVisitors ? Math.round((returningVisitors / totalVisitors) * 100) : 0,
      available: totalVisitors > 0,
    }

    // Разворачиваем строки в непрерывный ряд из 14 дней (включая пустые).
    const byDay = new Map<string, { visits: number; started: number; completed: number }>()
    for (const row of activityRows) {
      const key = String(row.day)
      const bucket = byDay.get(key) ?? { visits: 0, started: 0, completed: 0 }
      const n = Number(row.count)
      if (row.eventType === 'visit') bucket.visits += n
      else if (row.eventType === 'test_started') bucket.started += n
      else if (row.eventType === 'test_completed') bucket.completed += n
      byDay.set(key, bucket)
    }
    const activity: ActivityPoint[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setUTCDate(d.getUTCDate() - i)
      const key = d.toISOString().slice(0, 10)
      const bucket = byDay.get(key) ?? { visits: 0, started: 0, completed: 0 }
      activity.push({ date: key, ...bucket })
    }

    return { engagement, activity }
  } catch (error) {
    console.error('[v0] engagement metrics unavailable:', error instanceof Error ? error.message : error)
    return { engagement: EMPTY_ENGAGEMENT, activity: [] }
  }
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
  const [results, funnelRows, violationRows, feedbackItems, engagementAndActivity] = await Promise.all([
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
    getEngagementAndActivity(),
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
    engagement: engagementAndActivity.engagement,
    activity: engagementAndActivity.activity,
  }
}
