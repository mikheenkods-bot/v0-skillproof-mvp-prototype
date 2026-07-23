import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// HTTP-драйвер Neon вместо обычного pg.Pool. На Vercel (serverless) пул
// соединений pg «зависает» при холодном старте базы и функция убивается по
// таймауту — это и вызывало случайную ошибку «A server error occurred» (E80).
// neon() работает по HTTP, без долгоживущих соединений: база сама просыпается,
// первый запрос отрабатывает быстро и стабильно. Проект не использует
// транзакции и Better Auth, поэтому общий pg.Pool здесь не нужен.

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  return drizzle(neon(url), { schema })
}

// Ленивая инициализация. Раньше neon() вызывался прямо на верхнем уровне
// модуля, поэтому `next build` на этапе «Collecting page data» импортировал
// этот файл, сразу выполнял neon() и падал с «No database connection string»,
// если DATABASE_URL недоступен во время сборки — из-за этого не публиковался
// деплой и демо-домен не открывался. Теперь клиент создаётся только при первом
// реальном обращении к БД (во время запроса), а не при импорте/сборке.
let _db: ReturnType<typeof createDb> | null = null

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop, receiver) {
    if (!_db) _db = createDb()
    const value = Reflect.get(_db as object, prop, receiver)
    return typeof value === 'function' ? value.bind(_db) : value
  },
})
