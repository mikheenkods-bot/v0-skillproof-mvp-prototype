'use client'

import { Fragment, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  CheckCircle2,
  XCircle,
  ShieldAlert,
  FileDown,
  Search,
  LogOut,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import type { TestResult } from '@/lib/db/schema'
import { logoutAdmin } from './auth'

/** Форма одного навыка внутри result.skills (jsonb). */
type SkillEntry = { name?: string; score?: number; correct?: number; total?: number }
/** Форма одной записи журнала прокторинга внутри result.proctoringLog (jsonb). */
type ProctorEntry = {
  type?: string
  eventType?: string
  message?: string
  description?: string
  timestamp?: number | string
}

/** Человекочитаемые названия типов нарушений прокторинга. */
const PROCTOR_LABELS: Record<string, string> = {
  tab_switch: 'Переключение вкладки',
  tab_hidden: 'Уход со страницы',
  window_blur: 'Потеря фокуса окна',
  copy: 'Копирование',
  paste: 'Вставка',
  context_menu: 'Правый клик',
  fullscreen_exit: 'Выход из полноэкранного режима',
  face_not_detected: 'Лицо не обнаружено',
  multiple_faces: 'Несколько лиц в кадре',
  no_camera: 'Камера недоступна',
  devtools: 'Открытие DevTools',
}

function proctorLabel(type: string): string {
  return PROCTOR_LABELS[type] ?? type
}

export function ResultsTable({
  results,
  accessKey,
  embedded = false,
}: {
  results: TestResult[]
  accessKey: string
  /** Когда таблица встроена во вкладку дашборда, скрываем дублирующий заголовок и кнопку выхода. */
  embedded?: boolean
}) {
  const [query, setQuery] = useState('')
  // ID раскрытой строки: показываем детальную карточку прохождения по кандидату.
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Экспорт отфильтрованных результатов в CSV (открывается в Excel/Google Sheets).
  const exportCsv = () => {
    const headers = [
      'ID сертификата',
      'Специализация',
      'Балл (%)',
      'Правильных',
      'Всего вопросов',
      'Результат',
      'Прокторинг',
      'Нарушения',
      'Дата',
    ]
    const escape = (v: unknown) => {
      const s = String(v ?? '')
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = filtered.map((r) =>
      [
        r.certificateId,
        r.specialization,
        r.score,
        r.correctAnswers,
        r.totalQuestions,
        r.passed ? 'Пройден' : 'Не пройден',
        r.isClean ? 'Чисто' : 'С нарушениями',
        r.isClean ? 0 : r.violations,
        new Date(r.createdAt).toLocaleString('ru-RU'),
      ]
        .map(escape)
        .join(';')
    )
    // BOM для корректной кириллицы в Excel
    const csv = '\uFEFF' + [headers.join(';'), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `skillproof-results-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Скачивание JSON через API. Ключ передаём в заголовке x-api-key, а НЕ в URL:
  // иначе секрет (он же — пароль входа админа) утекает в историю браузера, логи
  // сервера и Referer. Роут /api/results поддерживает оба способа — выбираем
  // безопасный. Ответ сохраняем как файл через Blob.
  const [downloadingJson, setDownloadingJson] = useState(false)
  const downloadJson = async () => {
    if (downloadingJson) return
    setDownloadingJson(true)
    try {
      const res = await fetch('/api/results', {
        headers: { 'x-api-key': accessKey },
      })
      if (!res.ok) {
        throw new Error(`Ошибка ${res.status}`)
      }
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8;',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `skillproof-results-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[v0] JSON download failed:', err)
      alert('Не удалось скачать JSON. Попробуйте ещё раз.')
    } finally {
      setDownloadingJson(false)
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return results
    return results.filter(
      (r) =>
        r.certificateId.toLowerCase().includes(q) ||
        r.specialization.toLowerCase().includes(q)
    )
  }, [results, query])

  const passedCount = results.filter((r) => r.passed).length
  const flaggedCount = results.filter((r) => !r.isClean).length

  const Wrapper = embedded ? 'div' : 'main'

  return (
    <Wrapper className={embedded ? '' : 'container mx-auto px-4 py-8 max-w-6xl'}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          {!embedded && <h1 className="text-2xl font-bold">Результаты тестирования</h1>}
          <p className="text-muted-foreground text-sm">
            Всего записей: {results.length}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            <FileDown className="h-4 w-4" />
            Экспорт CSV
          </button>
          <button
            onClick={downloadJson}
            disabled={downloadingJson}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
          >
            <FileDown className="h-4 w-4" />
            {downloadingJson ? 'Загрузка…' : 'JSON (API)'}
          </button>
          {!embedded && (
            <form action={logoutAdmin}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Всего</p>
          <p className="text-2xl font-bold">{results.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">Пройдено</p>
          <p className="text-2xl font-bold text-emerald-600">{passedCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">С нарушениями</p>
          <p className="text-2xl font-bold text-amber-600">{flaggedCount}</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по ID сертификата или специализации"
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Кандидат</TableHead>
              <TableHead>Специализация</TableHead>
              <TableHead className="text-center">Балл</TableHead>
              <TableHead className="text-center">Результат</TableHead>
              <TableHead className="text-center">Прокторинг</TableHead>
              <TableHead>Дата</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Записей не найдено
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => {
              const isOpen = expandedId === r.id
              return (
                <Fragment key={r.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setExpandedId(isOpen ? null : r.id)}
                  >
                    <TableCell className="align-middle">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm font-medium">{r.certificateId}</div>
                      <div className="text-xs text-muted-foreground">
                        Анонимный кандидат
                      </div>
                    </TableCell>
                    <TableCell>{r.specialization}</TableCell>
                    <TableCell className="text-center font-medium">
                      {r.score}%
                      <span className="text-xs text-muted-foreground block">
                        {r.correctAnswers}/{r.totalQuestions}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {r.passed ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/15 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Пройден
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-destructive">
                          <XCircle className="h-3 w-3" />
                          Не пройден
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.isClean ? (
                        <span className="text-sm text-muted-foreground">Чисто</span>
                      ) : (
                        <Badge variant="secondary" className="gap-1 text-amber-700">
                          <ShieldAlert className="h-3 w-3" />
                          {r.violations}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString('ru-RU')}
                    </TableCell>
                  </TableRow>
                  {isOpen && (
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableCell colSpan={7} className="p-0">
                        <CandidateDetail result={r} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </Wrapper>
  )
}

/**
 * Детальная карточка прохождения по одному кандидату: разбивка баллов по
 * навыкам, оценка честности и полный журнал событий прокторинга.
 */
function CandidateDetail({ result }: { result: TestResult }) {
  const skills = (Array.isArray(result.skills) ? result.skills : []) as SkillEntry[]
  const log = (Array.isArray(result.proctoringLog) ? result.proctoringLog : []) as ProctorEntry[]

  const fmtTime = (t: number | string | undefined) => {
    if (t === undefined || t === null) return ''
    const d = new Date(typeof t === 'number' ? t : Number(t) || Date.parse(String(t)))
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('ru-RU')
  }

  return (
    <div className="grid gap-6 p-4 md:grid-cols-2">
      {/* Разбивка по навыкам */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">Результаты по навыкам</h3>
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">Детализация по навыкам недоступна.</p>
        ) : (
          <ul className="space-y-3">
            {skills.map((s, i) => {
              const score = Math.round(Number(s.score ?? 0))
              const tone =
                score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-amber-500' : 'bg-destructive'
              return (
                <li key={i}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate pr-2">{s.name ?? `Навык ${i + 1}`}</span>
                    <span className="font-medium tabular-nums">
                      {score}%
                      {s.correct !== undefined && s.total !== undefined && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({s.correct}/{s.total})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${score}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            Честность: {result.integrityScore}%
          </Badge>
          <Badge variant="secondary" className="gap-1">
            Итог: {result.correctAnswers}/{result.totalQuestions} ({result.score}%)
          </Badge>
        </div>
      </div>

      {/* Журнал прокторинга */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">
          Журнал прокторинга
          <span className="ml-1 text-muted-foreground">({log.length})</span>
        </h3>
        {log.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Нарушений не зафиксировано — тест пройден чисто.
          </div>
        ) : (
          <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
            {log.map((e, i) => {
              const type = String(e.type ?? e.eventType ?? 'event')
              const msg = e.message ?? e.description ?? ''
              return (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded-lg border bg-background p-2 text-sm"
                >
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <div className="font-medium">{proctorLabel(type)}</div>
                    {msg && <div className="text-xs text-muted-foreground break-words">{msg}</div>}
                    {fmtTime(e.timestamp) && (
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {fmtTime(e.timestamp)}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
