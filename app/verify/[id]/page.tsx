import Link from 'next/link'
import { Shield, CheckCircle2, XCircle, Award, ArrowLeft, AlertTriangle } from 'lucide-react'
import { getCertificateById } from '@/app/actions/test-results'

export const dynamic = 'force-dynamic'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const cert = await getCertificateById(id)

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>

        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="p-6 border-b border-border bg-primary/5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Проверка сертификата</h1>
              <p className="text-sm text-muted-foreground">работа.ру · SkillVerify</p>
            </div>
          </div>

          {cert.valid ? (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 rounded-xl bg-success/10 p-4 text-success">
                <CheckCircle2 className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-semibold">Сертификат действителен</p>
                  <p className="text-sm opacity-90">
                    Подлинность подтверждена в системе SkillVerify
                  </p>
                </div>
              </div>

              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">ID сертификата</dt>
                  <dd className="font-mono font-medium">{cert.certificateId}</dd>
                </div>
                {cert.candidateName && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Владелец</dt>
                    <dd className="font-medium">{cert.candidateName}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Направление</dt>
                  <dd className="font-medium">{cert.specialization}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Результат</dt>
                  <dd className="font-medium">{cert.score}%</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Честность прохождения</dt>
                  <dd className="font-medium">
                    {cert.isClean ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        Без нарушений
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-warning">
                        <AlertTriangle className="h-4 w-4" />
                        Требует проверки
                      </span>
                    )}
                  </dd>
                </div>
                {typeof cert.integrityScore === 'number' && (
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Integrity score</dt>
                    <dd className="font-medium">{cert.integrityScore}/100</dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Дата выдачи</dt>
                  <dd className="font-medium">{formatDate(cert.issuedAt)}</dd>
                </div>
              </dl>

              <div className="flex items-center justify-center gap-2 pt-2 text-sm text-muted-foreground">
                <Award className="h-4 w-4 text-primary" />
                Verified &amp; Proctored by работа.ру
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-destructive/10 p-4 text-destructive">
                <XCircle className="h-6 w-6 shrink-0" />
                <div>
                  <p className="font-semibold">Сертификат не найден</p>
                  <p className="text-sm opacity-90">
                    Сертификат с указанным идентификатором не зарегистрирован в системе
                    или не является действительным.
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Проверьте правильность идентификатора{' '}
                <span className="font-mono">{id}</span>. Если вы получили этот сертификат
                от кандидата, запросите у него актуальную ссылку для проверки.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
