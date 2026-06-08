'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_COOKIE = 'admin_session'

// Создаёт детерминированный токен сессии на основе секретного ключа.
// Так в cookie не хранится сам ключ доступа, а проверка не требует БД.
async function sessionToken(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`skillproof-admin:${secret}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Проверяет, авторизован ли текущий посетитель как администратор. */
export async function isAdminAuthenticated(): Promise<boolean> {
  const requiredKey = process.env.RESULTS_API_KEY
  if (!requiredKey) return false // fail closed

  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return false

  const expected = await sessionToken(requiredKey)
  return token === expected
}

/** Server action для формы входа. Возвращает текст ошибки или редиректит в админку. */
export async function loginAdmin(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const requiredKey = process.env.RESULTS_API_KEY
  if (!requiredKey) {
    return { error: 'Доступ не настроен: переменная RESULTS_API_KEY не задана.' }
  }

  const key = String(formData.get('key') || '').trim()
  if (!key) {
    return { error: 'Введите ключ доступа.' }
  }
  if (key !== requiredKey) {
    return { error: 'Неверный ключ доступа. Попробуйте снова.' }
  }

  const store = await cookies()
  store.set(SESSION_COOKIE, await sessionToken(requiredKey), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12 часов
  })

  redirect('/admin/results')
}

/** Server action для выхода: удаляет сессию и возвращает на форму входа. */
export async function logoutAdmin(): Promise<void> {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect('/admin/results')
}
