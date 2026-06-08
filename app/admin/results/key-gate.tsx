'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock } from 'lucide-react'

export function KeyGate({ invalid }: { invalid: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [key, setKey] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    params.set('key', key.trim())
    router.push(`/admin/results?${params.toString()}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border bg-card p-6 md:p-8"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl font-bold mb-1">Доступ к результатам</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Введите ключ доступа для просмотра результатов тестирования.
        </p>
        <div className="space-y-2 mb-4">
          <Label htmlFor="key">Ключ доступа</Label>
          <Input
            id="key"
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="••••••••"
            autoFocus
          />
        </div>
        {invalid && (
          <p className="text-sm text-destructive mb-4">
            Неверный ключ доступа. Попробуйте снова.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={!key.trim()}>
          Войти
        </Button>
      </form>
    </div>
  )
}
