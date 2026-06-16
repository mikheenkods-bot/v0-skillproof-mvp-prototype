'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Users,
  PlayCircle,
  CheckCircle2,
  XCircle,
  DoorOpen,
  ShieldAlert,
  MessageSquare,
  Star,
  LogOut,
  ListChecks,
  BarChart3,
} from 'lucide-react'
import { ResultsTable } from './results-table'
import { logoutAdmin } from './auth'
import type { DashboardData } from './dashboard-data'

export function AdminDashboard({
  data,
  accessKey,
}: {
  data: DashboardData
  accessKey: string
}) {
  const { results, funnel, violations, totalViolations, attemptsWithViolations, feedback } = data

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Панель администратора</h1>
            <p className="text-sm text-muted-foreground">
              Результаты тестирования, статистика, прокторинг и обратная связь
            </p>
          </div>
          <form action={logoutAdmin}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </form>
        </header>

        <Tabs defaultValue="results" className="w-full">
          <TabsList className="mb-6 flex h-auto flex-wrap justify-start gap-1">
            <TabsTrigger value="results">
              <ListChecks className="mr-2 h-4 w-4" />
              Результаты
            </TabsTrigger>
            <TabsTrigger value="stats">
              <BarChart3 className="mr-2 h-4 w-4" />
              Статистика
            </TabsTrigger>
            <TabsTrigger value="proctoring">
              <ShieldAlert className="mr-2 h-4 w-4" />
              Прокторинг
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="mr-2 h-4 w-4" />
              Обратная связь
            </TabsTrigger>
          </TabsList>

          {/* --- Результаты (существующая таблица) --- */}
          <TabsContent value="results">
            <ResultsTable results={results} accessKey={accessKey} embedded />
          </TabsContent>

          {/* --- Статистика прохождения (воронка) --- */}
          <TabsContent value="stats">
            <StatsTab funnel={funnel} />
          </TabsContent>

          {/* --- Прокторинг --- */}
          <TabsContent value="proctoring">
            <ProctoringTab
              violations={violations}
              totalViolations={totalViolations}
              attemptsWithViolations={attemptsWithViolations}
            />
          </TabsContent>

          {/* --- Обратная связь --- */}
          <TabsContent value="feedback">
            <FeedbackTab feedback={feedback} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'default',
}: {
  icon: React.ElementType
  label: string
  value: number | string
  hint?: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const toneClasses: Record<string, string> = {
    default: 'bg-muted text-foreground',
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
    danger: 'bg-destructive/10 text-destructive',
  }
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="text-sm text-muted-foreground truncate">{label}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  )
}

function StatsTab({ funnel }: { funnel: DashboardData['funnel'] }) {
  const pct = (n: number) => (funnel.visits ? Math.round((n / funnel.visits) * 100) : 0)
  // Шаги воронки для наглядной полосовой диаграммы.
  const steps = [
    { label: 'Зашли на сайт', value: funnel.visits, color: 'bg-sky-500' },
    { label: 'Приступили к тесту', value: funnel.started, color: 'bg-indigo-500' },
    { label: 'Завершили тест', value: funnel.completed, color: 'bg-emerald-500' },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Заходило на сайт" value={funnel.visits} />
        <StatCard icon={PlayCircle} label="Приступило к тестам" value={funnel.started} tone="default" />
        <StatCard icon={CheckCircle2} label="Завершило тест" value={funnel.completed} tone="success" />
        <StatCard
          icon={DoorOpen}
          label="Не открыли тест"
          value={funnel.notStarted}
          hint="Зашли, но не приступили"
          tone="warning"
        />
        <StatCard
          icon={XCircle}
          label="Не завершило тест"
          value={funnel.notCompleted}
          hint="Приступили, но не дошли до конца"
          tone="danger"
        />
        <StatCard
          icon={DoorOpen}
          label="Вышли досрочно"
          value={funnel.abandoned}
          hint="Явный выход из теста"
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Воронка прохождения</CardTitle>
          <CardDescription>Доли считаются от общего числа заходов на сайт</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {steps.map((step) => (
            <div key={step.label}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{step.label}</span>
                <span className="font-medium">
                  {step.value} <span className="text-muted-foreground">({pct(step.value)}%)</span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${step.color}`}
                  style={{ width: `${pct(step.value)}%` }}
                />
              </div>
            </div>
          ))}
          {funnel.visits === 0 && (
            <p className="text-sm text-muted-foreground">
              Пока нет данных о заходах. Статистика появится, когда кандидаты начнут открывать страницу тестирования.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ProctoringTab({
  violations,
  totalViolations,
  attemptsWithViolations,
}: {
  violations: DashboardData['violations']
  totalViolations: number
  attemptsWithViolations: number
}) {
  const severityBadge: Record<string, { label: string; className: string }> = {
    low: { label: 'низкая', className: 'bg-muted text-muted-foreground' },
    medium: { label: 'средняя', className: 'bg-amber-500/15 text-amber-600' },
    high: { label: 'высокая', className: 'bg-orange-500/15 text-orange-600' },
    critical: { label: 'критическая', className: 'bg-destructive/15 text-destructive' },
  }
  const maxCount = violations.reduce((m, v) => Math.max(m, v.count), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={ShieldAlert} label="Всего нарушений" value={totalViolations} tone="danger" />
        <StatCard icon={Users} label="Попыток с нарушениями" value={attemptsWithViolations} tone="warning" />
        <StatCard icon={ListChecks} label="Типов нарушений" value={violations.length} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Нарушения по типам</CardTitle>
          <CardDescription>Какие именно нарушения прокторинга фиксировались</CardDescription>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Нарушений прокторинга не зафиксировано.
            </p>
          ) : (
            <ul className="space-y-3">
              {violations.map((v) => {
                const badge = severityBadge[v.severity]
                return (
                  <li key={v.eventType}>
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <span className="truncate font-medium">{v.label}</span>
                        <Badge variant="secondary" className={badge.className}>
                          {badge.label}
                        </Badge>
                      </span>
                      <span className="shrink-0 font-semibold">{v.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-destructive"
                        style={{ width: `${maxCount ? Math.round((v.count / maxCount) * 100) : 0}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FeedbackTab({ feedback }: { feedback: DashboardData['feedback'] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={MessageSquare} label="Всего отзывов" value={feedback.total} />
        <StatCard
          icon={Star}
          label="Средняя оценка"
          value={feedback.total ? feedback.averageRating.toFixed(1) : '—'}
          tone="success"
        />
        <StatCard
          icon={Star}
          label="Положительных (4–5)"
          value={feedback.distribution[3] + feedback.distribution[4]}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Распределение оценок</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = feedback.distribution[star - 1]
            const pct = feedback.total ? Math.round((count / feedback.total) * 100) : 0
            return (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="flex w-10 items-center gap-1 text-muted-foreground">
                  {star}
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Отзывы кандидатов</CardTitle>
          <CardDescription>Комментарии после прохождения тестирования</CardDescription>
        </CardHeader>
        <CardContent>
          {feedback.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет отзывов.</p>
          ) : (
            <ul className="space-y-4">
              {feedback.items.map((f) => (
                <li key={f.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < f.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(f.createdAt).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  {f.comment ? (
                    <p className="text-sm text-pretty">{f.comment}</p>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Без комментария</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {f.candidateName ? <span>{f.candidateName}</span> : null}
                    {f.candidateEmail ? <span>{f.candidateEmail}</span> : null}
                    {f.specialization ? <span>{f.specialization}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
