'use client'

import { User, FolderOpen, AppWindow, Upload } from 'lucide-react'

const steps = [
  {
    icon: User,
    text: (
      <>
        Зайдите в личный кабинет на <strong>Работа.ру</strong>
      </>
    ),
  },
  {
    icon: FolderOpen,
    text: (
      <>
        Перейдите: <strong>Профиль → Дипломы и сертификаты</strong>
      </>
    ),
  },
  {
    icon: AppWindow,
    text: (
      <>
        В поле <strong>Наименование</strong> вставьте:{' '}
        <span className="font-semibold text-primary">www.skill-verify.ru</span>
      </>
    ),
  },
  {
    icon: Upload,
    text: (
      <>
        Заполните год получения и <strong>загрузите файл сертификата</strong>
      </>
    ),
  },
]

export function RabotaUploadInstruction() {
  return (
    <div className="rounded-2xl border bg-card p-6 text-left">
      <h3 className="text-lg font-bold mb-1 text-balance">
        Как загрузить сертификат на Работа.ру
      </h3>
      <p className="text-sm text-muted-foreground mb-5">
        Скачайте PDF выше и добавьте его в свой профиль за 4 шага.
      </p>

      <ol className="space-y-4">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <li key={i} className="flex items-center gap-4">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-pretty">{step.text}</p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
