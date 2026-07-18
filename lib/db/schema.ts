import { pgTable, serial, text, integer, boolean, jsonb, timestamp, bigint, index } from 'drizzle-orm/pg-core'

/**
 * Анонимные кандидаты. Персональные данные (имя/e-mail) заменены на уникальный
 * 4-значный PIN. Сам PIN НИКОГДА не хранится в открытом виде:
 *   - pin_hash   — bcrypt-хэш PIN (для проверки при повторном входе);
 *   - pin_lookup — HMAC-SHA256(pin, SERVER_PEPPER) в hex (детерминированный
 *                  ключ для поиска/уникальности, т.к. bcrypt искать нельзя).
 * UNIQUE-индекс на pin_lookup — единственный источник истины по уникальности PIN.
 */
export const candidates = pgTable(
  'candidates',
  {
    id: serial('id').primaryKey(),
    pinHash: text('pin_hash').notNull(),
    pinLookup: text('pin_lookup').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  },
  (table) => ({
    pinLookupIdx: index('idx_candidates_pin_lookup').on(table.pinLookup),
  })
)

export type Candidate = typeof candidates.$inferSelect
export type NewCandidate = typeof candidates.$inferInsert

export const testResults = pgTable(
  'test_results',
  {
    id: serial('id').primaryKey(),
    certificateId: text('certificate_id').notNull().unique(),
    // ПДн удалены: candidate_name / candidate_email больше не хранятся.
    // Идентификация кандидата — через анонимный PIN.
    candidateId: integer('candidate_id').references(() => candidates.id),
    pinLookup: text('pin_lookup'),
    specialization: text('specialization').notNull(),
    score: integer('score').notNull(),
    correctAnswers: integer('correct_answers').notNull(),
    totalQuestions: integer('total_questions').notNull(),
    passed: boolean('passed').notNull(),
    isClean: boolean('is_clean').notNull().default(true),
    violations: integer('violations').notNull().default(0),
    integrityScore: integer('integrity_score').notNull().default(0),
    skills: jsonb('skills').notNull().default([]),
    proctoringLog: jsonb('proctoring_log').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pinLookupIdx: index('idx_test_results_pin_lookup').on(table.pinLookup),
    candidateIdx: index('idx_test_results_candidate').on(table.candidateId),
  })
)

export type TestResult = typeof testResults.$inferSelect
export type NewTestResult = typeof testResults.$inferInsert

/**
 * Durable proctoring event log. Each row is one event, linked to an
 * attemptId (and optionally a certificateId once the test is finalised).
 * Persisting these to the database means the honesty report survives a
 * server restart — previously events lived only in an in-memory Map.
 */
export const proctoringEvents = pgTable(
  'proctoring_events',
  {
    id: serial('id').primaryKey(),
    attemptId: text('attempt_id').notNull(),
    certificateId: text('certificate_id'),
    eventId: text('event_id'),
    eventType: text('event_type').notNull(),
    description: text('description'),
    timestamp: bigint('timestamp', { mode: 'number' }),
    previousHash: text('previous_hash'),
    currentHash: text('current_hash'),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    attemptIdx: index('idx_proctoring_events_attempt').on(table.attemptId),
    certIdx: index('idx_proctoring_events_cert').on(table.certificateId),
  })
)

export type ProctoringEventRow = typeof proctoringEvents.$inferSelect
export type NewProctoringEventRow = typeof proctoringEvents.$inferInsert

/**
 * Funnel analytics. One row per tracked step so admins can see how many people
 * visited the test page, started a test, completed it, or abandoned it midway.
 * eventType is one of: 'visit' | 'test_started' | 'test_completed' | 'test_abandoned'.
 * Колонка email удалена — ПДн в аналитике не хранятся.
 */
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: serial('id').primaryKey(),
    eventType: text('event_type').notNull(),
    attemptId: text('attempt_id'),
    specialization: text('specialization'),
    // Анонимный идентификатор посетителя (UUID из localStorage браузера).
    // Не является ПДн — генерируется случайно на клиенте и нужен только для
    // подсчёта уникальных посетителей (DAU/MAU) и retention.
    visitorId: text('visitor_id'),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('idx_analytics_events_type').on(table.eventType),
    visitorIdx: index('idx_analytics_events_visitor').on(table.visitorId),
    createdAtIdx: index('idx_analytics_events_created_at').on(table.createdAt),
  })
)

export type AnalyticsEventRow = typeof analyticsEvents.$inferSelect
export type NewAnalyticsEventRow = typeof analyticsEvents.$inferInsert

/**
 * Candidate feedback collected after finishing the test: a 1–5 rating and an
 * optional free-text comment. Surfaced to admins on the results dashboard.
 * ПДн (candidate_email / candidate_name) удалены; вместо них — анонимный
 * pin_lookup (nullable), чтобы при необходимости связать отзыв с кандидатом.
 */
export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  certificateId: text('certificate_id'),
  pinLookup: text('pin_lookup'),
  specialization: text('specialization'),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type FeedbackRow = typeof feedback.$inferSelect
export type NewFeedbackRow = typeof feedback.$inferInsert

/**
 * Durable rate-limit buckets. A process-memory limiter resets on every
 * serverless cold start, which would neuter brute-force protection on the
 * PIN endpoints (only 10 000 combinations). One row = one fixed window per key
 * (e.g. "pin:register:<ip>").
 */
export const rateLimits = pgTable('rate_limits', {
  bucketKey: text('bucket_key').primaryKey(),
  count: integer('count').notNull().default(0),
  resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type RateLimitRow = typeof rateLimits.$inferSelect

/**
 * Durable server-side secrets that must survive restarts and be identical
 * across every runtime instance/environment sharing this database.
 *
 * Used as a self-healing fallback for the PIN pepper: if SERVER_PEPPER is not
 * configured (or is too weak), the app generates a strong secret ONCE, stores
 * it here, and reuses it forever — so anonymous PIN registration works out of
 * the box in every environment without manual env-var setup.
 *
 * Trade-off vs an env-var pepper: the secret lives in the same database as the
 * data it protects. An explicitly configured SERVER_PEPPER always takes
 * precedence and is preferred for the strongest protection.
 */
export const appSecrets = pgTable('app_secrets', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AppSecretRow = typeof appSecrets.$inferSelect
export type NewAppSecretRow = typeof appSecrets.$inferInsert
