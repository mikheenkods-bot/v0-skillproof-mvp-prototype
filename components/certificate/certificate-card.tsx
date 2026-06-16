"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Award, CheckCircle2, Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { downloadCertificatePdf, generateQrDataUrl, getVerifyUrl } from '@/lib/certificate-pdf'

interface CertificateCardProps {
  candidateName: string
  specialization: string
  score: number
  isClean: boolean
  date: string
  certificateId: string
  candidateEmail?: string
  correctAnswers?: number
  totalQuestions?: number
  attemptNumber?: number
  maxAttempts?: number
  onDownload?: () => void
}

export function CertificateCard({
  candidateName,
  specialization,
  score,
  isClean,
  date,
  certificateId,
  candidateEmail = '',
  correctAnswers = 0,
  totalQuestions = 0,
  attemptNumber = 1,
  maxAttempts = 2,
  onDownload
}: CertificateCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let active = true
    generateQrDataUrl(certificateId)
      .then((url) => {
        if (active) setQrDataUrl(url)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [certificateId])

  const handleDownload = async () => {
    if (onDownload) {
      onDownload()
      return
    }
    setDownloading(true)
    try {
      const parsed = new Date(date)
      await downloadCertificatePdf({
        certificateId,
        candidateName,
        candidateEmail,
        specialization,
        score,
        correctAnswers,
        totalQuestions,
        attemptNumber,
        maxAttempts,
        date: isNaN(parsed.getTime()) ? new Date() : parsed,
      })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary/5"
    >
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
        <div className="text-[120px] font-bold rotate-[-30deg] whitespace-nowrap">
          VERIFIED PROCTORED
        </div>
      </div>

      {/* Header */}
      <div className="relative p-6 border-b border-border bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/20">
              <Award className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">Сертификат SkillProof</h3>
              <p className="text-sm text-muted-foreground">работа.ру SkillVerify</p>
            </div>
          </div>
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
            isClean ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
          )}>
            {isClean ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Честно пройдено
              </>
            ) : (
              <>
                <Shield className="h-4 w-4" />
                Требует проверки
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative p-6 space-y-6">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">Настоящим подтверждается, что</p>
          <p className="text-2xl font-bold">{candidateName}</p>
          <p className="text-muted-foreground">
            успешно прошел(а) тестирование по направлению
          </p>
          <p className="text-lg font-semibold text-primary">{specialization}</p>
        </div>

        <div className="flex justify-center">
          <div className="relative">
            <svg className="w-32 h-32" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted/20"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${score * 2.83} 283`}
                transform="rotate(-90 50 50)"
                className="text-primary"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold">{score}%</span>
              <span className="text-xs text-muted-foreground">результат</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-card">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl || "/placeholder.svg"}
                  alt={`QR-код для проверки сертификата ${certificateId}`}
                  className="h-12 w-12"
                />
              ) : (
                <div className="h-12 w-12 animate-pulse rounded bg-muted" />
              )}
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">ID сертификата</p>
              <p className="font-mono font-medium">{certificateId}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Сканируйте QR для проверки
              </p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Дата выдачи</p>
            <p className="font-medium">{date}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">
            Verified & Proctored by работа.ру
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="relative p-4 border-t border-border bg-muted/30 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={handleDownload} disabled={downloading}>
          <Download className="mr-2 h-4 w-4" />
          {downloading ? 'Готовим PDF…' : 'Скачать PDF'}
        </Button>
        <Button variant="outline" size="icon" asChild title="Открыть страницу проверки">
          <a href={getVerifyUrl(certificateId)} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">Открыть страницу проверки сертификата</span>
          </a>
        </Button>
      </div>
    </motion.div>
  )
}
