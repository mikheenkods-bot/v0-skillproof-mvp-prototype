import { pgTable, serial, text, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core'

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
  skills: jsonb('skills').notNull().default([]),
  proctoringLog: jsonb('proctoring_log').notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type TestResult = typeof testResults.$inferSelect
export type NewTestResult = typeof testResults.$inferInsert
