import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// HTTP-драйвер Neon вместо обычного pg.Pool. На Vercel (serverless) пул
// соединений pg «зависает» при холодном старте базы и функция убивается по
// таймауту — это и вызывало случайную ошибку «A server error occurred» (E80).
// neon() работает по HTTP, без долгоживущих соединений: база сама просыпается,
// первый запрос отрабатывает быстро и стабильно. Проект не использует
// транзакции и Better Auth, поэтому общий pg.Pool здесь не нужен.
const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
