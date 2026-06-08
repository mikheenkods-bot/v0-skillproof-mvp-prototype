'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock } from 'lucide-react'
import { loginAdmin } from './auth'

export function KeyGate({ notConfigured }: { notConfigured: boolean }) {
  const [state, formAction, pending] = useActionState(loginAdmin, undefined)

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        action={formAction}
        className="w-full max-w-sm rounded-2xl border bg-card p-6 md:p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold mb-1">Панель администратора</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Введите ключ доступа, чтобы посмотреть результаты тестирования
          кандидатов.
        </p>
        <div className="space-y-2 mb-4">
          <Label htmlFor="key">Ключ доступа</Label>
          <Input
            id="key"
            name="key"
            type="password"
            placeholder="••••••••"
            autoFocus
            autoComplete="current-password"
            disabled={notConfigured}
          />
        </div>
        {notConfigured && (
          <p className="text-sm text-destructive mb-4">
            Доступ не настроен: задайте переменную окружения RESULTS_API_KEY.
          </p>
        )}
        {state?.error && (
          <p className="text-sm text-destructive mb-4">{state.error}</p>
        )}
        <Button type="submit" className="w-full" disabled={pending || notConfigured}>
          {pending ? 'Вход…' : 'Войти'}
        </Button>
      </form>
    </div>
  )
}
