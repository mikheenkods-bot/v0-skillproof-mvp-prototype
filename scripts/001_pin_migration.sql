-- =============================================================================
-- Миграция 001 — переход на анонимный PIN вместо персональных данных (ПДн).
-- Идемпотентна: использует IF EXISTS / IF NOT EXISTS, безопасно запускать
-- повторно. Порядок важен: сначала создаём candidates (на неё ссылается FK),
-- затем правим остальные таблицы. Дроп ПДн-колонок физически удаляет
-- персональные данные из старых строк.
-- =============================================================================

-- 1. Анонимные кандидаты -------------------------------------------------------
CREATE TABLE IF NOT EXISTS candidates (
  id            serial PRIMARY KEY,
  pin_hash      text        NOT NULL,
  pin_lookup    text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz
);

-- UNIQUE-индекс на pin_lookup — единственный источник истины по уникальности PIN.
CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_pin_lookup
  ON candidates (pin_lookup);

-- 2. test_results: удаляем ПДн, добавляем анонимную привязку -------------------
ALTER TABLE test_results DROP COLUMN IF EXISTS candidate_name;
ALTER TABLE test_results DROP COLUMN IF EXISTS candidate_email;

ALTER TABLE test_results ADD COLUMN IF NOT EXISTS candidate_id integer;
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS pin_lookup   text;

-- FK на candidates добавляем отдельно и идемпотентно (ADD COLUMN не гарантирует
-- создание constraint, если колонка уже была).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'test_results_candidate_id_fkey'
  ) THEN
    ALTER TABLE test_results
      ADD CONSTRAINT test_results_candidate_id_fkey
      FOREIGN KEY (candidate_id) REFERENCES candidates(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_test_results_pin_lookup ON test_results (pin_lookup);
CREATE INDEX IF NOT EXISTS idx_test_results_candidate  ON test_results (candidate_id);

-- 3. analytics_events: удаляем e-mail -----------------------------------------
ALTER TABLE analytics_events DROP COLUMN IF EXISTS email;

-- 4. feedback: удаляем ПДн, добавляем анонимную привязку -----------------------
ALTER TABLE feedback DROP COLUMN IF EXISTS candidate_email;
ALTER TABLE feedback DROP COLUMN IF EXISTS candidate_name;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS pin_lookup text;
