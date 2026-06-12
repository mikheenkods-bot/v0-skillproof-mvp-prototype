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
