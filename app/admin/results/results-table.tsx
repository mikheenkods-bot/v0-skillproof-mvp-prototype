'use client'

import { useMemo, useState } from 'react'
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
import { CheckCircle2, XCircle, ShieldAlert, FileDown, Search, LogOut } from 'lucide-react'
import type { TestResult } from '@/lib/db/schema'
import { logoutAdmin } from './auth'

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

  // Экспорт отфильтрованных результатов в CSV (открывается в Excel/Google Sheets).
  const exportCsv = () => {
    const headers = [
      'Имя',
      'Email',
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
        r.candidateName || '',
        r.candidateEmail || '',
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
        r.candidateName?.toLowerCase().includes(q) ||
        r.candidateEmail?.toLowerCase().includes(q) ||
        r.certificateId.toLowerCase().includes(q)
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

      <div className="grid grid-cols-3 gap-4 mb-6">
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
          placeholder="Поиск по имени, email или ID сертификата"
          className="pl-9"
        />
      </div>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Записей не найдено
                </TableCell>
              </TableRow>
            )}
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <div className="font-medium">{r.candidateName || '—'}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.candidateEmail || r.certificateId}
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
            ))}
          </TableBody>
        </Table>
      </div>
    </Wrapper>
  )
}
