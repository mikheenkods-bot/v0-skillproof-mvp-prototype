-- Schema for lib/db/schema.ts (testResults). Runs automatically on first
-- start of the postgres container via docker-entrypoint-initdb.d.
CREATE TABLE IF NOT EXISTS test_results (
  id serial PRIMARY KEY,
  certificate_id text NOT NULL UNIQUE,
  candidate_name text,
  candidate_email text,
  specialization text NOT NULL,
  score integer NOT NULL,
  correct_answers integer NOT NULL,
  total_questions integer NOT NULL,
  passed boolean NOT NULL,
  is_clean boolean NOT NULL DEFAULT true,
  violations integer NOT NULL DEFAULT 0,
  skills jsonb NOT NULL DEFAULT '[]',
  proctoring_log jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS test_results_candidate_email_lower_idx
  ON test_results (lower(candidate_email));
