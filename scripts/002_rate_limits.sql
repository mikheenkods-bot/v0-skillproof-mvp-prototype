-- =============================================================================
-- Миграция 002 — устойчивый rate-limit (защита от перебора PIN).
-- Лимитер в памяти процесса обнуляется при холодном старте serverless-функции,
-- поэтому счётчики попыток храним в БД. Одна строка = одно окно по ключу
-- (например "pin:register:<ip>"). Идемпотентна.
-- =============================================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key text PRIMARY KEY,
  count      integer     NOT NULL DEFAULT 0,
  reset_at   timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits (reset_at);
