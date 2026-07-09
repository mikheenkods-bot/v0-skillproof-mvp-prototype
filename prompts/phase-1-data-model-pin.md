# ФАЗА 1 — МОДЕЛЬ ДАННЫХ: УДАЛЕНИЕ ПДн, ВВЕДЕНИЕ PIN

> Сначала вставь общий контекст из `prompts/00-context.md`, затем — задание ниже.

## Задание

### 1.1 Схема БД (lib/db/schema.ts) + SQL-миграция
- Создай новую таблицу `candidates`:
  - `id serial PK`
  - `pin_hash text NOT NULL` — хэш PIN (см. 1.2)
  - `pin_lookup text NOT NULL UNIQUE` — детерминированный ключ для UNIQUE и поиска (см. 1.2)
  - `created_at timestamptz NOT NULL DEFAULT now()`
  - `last_seen_at timestamptz`
  - UNIQUE-индекс на `pin_lookup` — единственный источник истины по уникальности PIN.
- В `test_results`: УДАЛИ колонки `candidate_name` и `candidate_email`. Добавь
  `candidate_id integer REFERENCES candidates(id)` и `pin_lookup text` (денормализация для
  быстрых выборок), индекс по `pin_lookup`.
- В `analytics_events`: УДАЛИ колонку `email`. При необходимости добавь `pin_lookup` (или
  ничего — воронке хватает `attempt_id`).
- В `feedback`: УДАЛИ `candidate_email` и `candidate_name`; оставь `certificate_id`,
  `specialization`, `rating`, `comment`; добавь `pin_lookup` (nullable).
- Напиши SQL-миграцию: создание `candidates`, `ALTER TABLE ... DROP COLUMN` для ПДн-полей,
  добавление новых колонок и индексов. Миграция идемпотентна (`IF EXISTS` / `IF NOT EXISTS`).
  Старые строки с ПДн должны быть либо удалены, либо очищены — не оставляй персональные данные
  в базе.

### 1.2 Как хранить PIN (важно для аудита)
- НЕ храни PIN в открытом виде. Храни:
  - `pin_hash` — bcrypt/argon2-хэш PIN (для проверки при входе/восстановлении);
  - `pin_lookup` — `HMAC-SHA256(pin, SERVER_PEPPER)`, hex-строка. Детерминированное значение
    позволяет (а) наложить UNIQUE-индекс и гарантировать отсутствие дублей, (б) быстро находить
    кандидата по введённому PIN, не храня сам PIN.
- `SERVER_PEPPER` — обязательная серверная переменная окружения (не `NEXT_PUBLIC_*`). Если не
  задана — приложение отказывается работать с PIN (fail-closed), а не молча использует пустой
  pepper.
- PIN никогда не логируется, не попадает в аналитику, не уходит в клиентские логи и не
  отображается в URL/query-параметрах.

## Критерий готовности фазы
- Схема и миграция готовы, идемпотентны, применяются без ошибок.
- В БД нет ПДн-колонок; есть `candidates`, `pin_lookup`, `candidate_id`.
- Отчёт: изменённые файлы + текст SQL-миграции.
