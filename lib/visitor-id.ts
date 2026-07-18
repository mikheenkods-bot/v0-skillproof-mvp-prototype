'use client'

/**
 * Анонимный идентификатор посетителя для аналитики (DAU/MAU/retention).
 *
 * Это НЕ персональные данные: случайный UUID, который генерируется в браузере
 * один раз и хранится в localStorage. Он не связан с личностью и нужен только
 * чтобы отличать уникальных посетителей от повторных заходов при подсчёте
 * метрик вовлечённости. Если localStorage недоступен (приватный режим,
 * блокировка) — возвращаем эфемерный id, аналитика просто будет менее точной.
 */
const STORAGE_KEY = 'skillproof_visitor_id'

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
  } catch {
    // fall through
  }
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function getVisitorId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing) return existing
    const id = randomId()
    window.localStorage.setItem(STORAGE_KEY, id)
    return id
  } catch {
    // localStorage недоступен — эфемерный id на время сессии страницы.
    return randomId()
  }
}
