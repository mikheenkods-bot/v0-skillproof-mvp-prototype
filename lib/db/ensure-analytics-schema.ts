import 'server-only'
import { sql } from 'drizzle-orm'
import { db } from './index'

/**
 * Idempotent, self-healing migration for the engagement-analytics columns.
 *
 * The dashboard needs a per-visitor identifier (visitor_id) to compute DAU/MAU
 * and retention. Rather than requiring a manual migration step, we add the
 * column + supporting indexes lazily the first time either the tracker or the
 * admin dashboard touches the database. All statements use IF NOT EXISTS, so
 * running them repeatedly is a no-op.
 *
 * Guarded by a module-level promise so the DDL runs at most once per process.
 * Any failure (e.g. the DB is briefly unavailable) is swallowed and retried on
 * the next call — it must never break the caller.
 */
let ensured: Promise<void> | null = null

async function runMigration(): Promise<void> {
  await db.execute(
    sql`ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS visitor_id text`
  )
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor ON analytics_events (visitor_id)`
  )
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at)`
  )
}

export function ensureAnalyticsSchema(): Promise<void> {
  if (!ensured) {
    ensured = runMigration().catch((error) => {
      // Reset so the next caller retries; never surface the error.
      ensured = null
      console.error('[v0] ensureAnalyticsSchema failed (will retry):', error instanceof Error ? error.message : error)
    })
  }
  return ensured
}
