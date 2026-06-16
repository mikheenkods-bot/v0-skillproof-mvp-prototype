import { pgTable, serial, text, integer, boolean, jsonb, timestamp, bigint, index } from 'drizzle-orm/pg-core'

export const testResults = pgTable('test_results', {
  id: serial('id').primaryKey(),
  certificateId: text('certificate_id').notNull().unique(),
  candidateName: text('candidate_name'),
  candidateEmail: text('candidate_email'),
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
})

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
 */
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: serial('id').primaryKey(),
    eventType: text('event_type').notNull(),
    attemptId: text('attempt_id'),
    email: text('email'),
    specialization: text('specialization'),
    payload: jsonb('payload').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('idx_analytics_events_type').on(table.eventType),
  })
)

export type AnalyticsEventRow = typeof analyticsEvents.$inferSelect
export type NewAnalyticsEventRow = typeof analyticsEvents.$inferInsert

/**
 * Candidate feedback collected after finishing the test: a 1–5 rating and an
 * optional free-text comment. Surfaced to admins on the results dashboard.
 */
export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  certificateId: text('certificate_id'),
  candidateEmail: text('candidate_email'),
  candidateName: text('candidate_name'),
  specialization: text('specialization'),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type FeedbackRow = typeof feedback.$inferSelect
export type NewFeedbackRow = typeof feedback.$inferInsert
