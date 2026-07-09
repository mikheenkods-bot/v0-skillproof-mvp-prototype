'use client'

import { useState } from 'react'
import { KeyRound, Loader2, Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  getCertificatesByPin,
  type RecoveredCertificate,
} from '@/app/actions/pin'
import { downloadCertificatePdf } from '@/lib/certificate-pdf'
import { TEST_CONFIG } from '@/lib/demo-data'

type Phase = 'idle' | 'searching' | 'done'

/**
 * Восстановление сертификата по коду (Фаза 3).
 * Показывает только обезличенные поля успешно пройденных тестов и позволяет
 * заново скачать PDF. Ответ одинаков для «кода нет» и «код есть, но не сдан»,
 * поэтому подобрать чужой код перебором нельзя (плюс серверный rate-limit).
 */
export function CertificateRecovery() {
  const [open, setOpen] = useState(false)
  const [pin, setPin] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [results, setResults] = useState<RecoveredCertificate[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!/^[0-9]{4}$/.test(pin) || phase === 'searching') return
    setPhase('searching')
    setNotice(null)
    try {
      const res = await getCertificatesByPin(pin)
      if (res.retryAfterSeconds) {
        setNotice('Слишком много запросов. Попробуйте позже.')
        setResults([])
        setPhase('idle')
        return
      }
      setResults(res.certificates)
      setPhase('done')
      if (res.certificates.length === 0) {
        setNotice('По этому коду не найдено сертификатов о сдаче.')
      }
    } catch (error) {
      console.error('[v0] certificate recovery failed:', error)
      setNotice('Не удалось выполнить поиск. Попробуйте ещё раз.')
      setPhase('idle')
    }
  }

  const handleDownload = async (cert: RecoveredCertificate) => {
    setDownloadingId(cert.certificateId)
    try {
      await downloadCertificatePdf({
        certificateId: cert.certificateId,
        specialization: cert.specialization,
        score: cert.score,
        correctAnswers: Math.round((cert.score / 100) * TEST_CONFIG.QUESTIONS_PER_TEST),
        totalQuestions: TEST_CONFIG.QUESTIONS_PER_TEST,
        attemptNumber: 1,
        maxAttempts: TEST_CONFIG.MAX_ATTEMPTS,
        date: cert.issuedAt ? new Date(cert.issuedAt) : new Date(),
      })
    } catch (error) {
      console.error('[v0] certificate re-download failed:', error)
      setNotice('Не удалось сформировать PDF. Попробуйте ещё раз.')
    } finally {
      setDownloadingId(null)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <KeyRound className="h-4 w-4" />
        Уже проходили? Восстановить сертификат по коду
      </button>
    )
  }

  return (
    <div className="mt-4 rounded-2xl border bg-card p-6 text-left">
      <div className="mb-1 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Восстановление сертификата</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
        Введите код, который вы указали при прохождении теста. Мы покажем ваши
        сертификаты — их можно скачать повторно.
      </p>

      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="recover-pin">Код доступа</Label>
          <Input
            id="recover-pin"
            data-testid="recover-pin-input"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
              if (notice) setNotice(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                handleSearch()
              }
            }}
            placeholder="••••"
            className="text-center text-xl tracking-[0.5em] font-mono"
          />
        </div>
        <Button
          onClick={handleSearch}
          data-testid="recover-submit"
          disabled={!/^[0-9]{4}$/.test(pin) || phase === 'searching'}
          className="gap-2"
        >
          {phase === 'searching' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          Найти
        </Button>
      </div>

      {notice && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {notice}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-4 space-y-2">
          {results.map((cert) => (
            <li
              key={cert.certificateId}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-4"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{cert.specialization}</p>
                <p className="text-sm text-muted-foreground">
                  {cert.score} / 100
                  {cert.issuedAt
                    ? ` · ${new Date(cert.issuedAt).toLocaleDateString('ru-RU')}`
                    : ''}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {cert.certificateId}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-2 bg-transparent"
                onClick={() => handleDownload(cert)}
                disabled={downloadingId === cert.certificateId}
              >
                {downloadingId === cert.certificateId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                PDF
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
