# Развёртывание на российском хостинге (VPS + Docker)

Подходит любой VPS с Ubuntu 22.04/24.04: Timeweb Cloud, Beget VPS, Selectel,
reg.ru и т.п. Минимум: 2 CPU / 2 ГБ RAM / 20 ГБ диска (сборка Next.js — самая
тяжёлая часть; на 1 ГБ RAM сборка может падать по памяти).

Весь стек поднимается одной командой `docker compose up`: приложение (Next.js,
standalone), Postgres 17 (таблица создаётся автоматически из `db/init.sql`)
и Caddy, который сам выпускает и продлевает TLS-сертификат Let's Encrypt.

## Шаги

1. **Создайте VPS** (Ubuntu 24.04) и направьте DNS A-запись домена на его IP.
   Дождитесь, пока запись начнёт резолвиться (`nslookup ваш-домен`).

2. **Установите Docker** на сервере:

   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

3. **Доставьте код на сервер** — git clone (если репозиторий доступен) или
   rsync/scp каталога проекта:

   ```bash
   git clone <url-репозитория> skillproof && cd skillproof
   ```

4. **Создайте `.env`** из шаблона и заполните:

   ```bash
   cp .env.example .env
   nano .env
   ```

   Обязательные: `DOMAIN`, `POSTGRES_PASSWORD`, `RESULTS_API_KEY`.
   Опциональные: `RESEND_API_KEY` (письма), `AI_GATEWAY_API_KEY` (AI-оценка
   открытых ответов; без него грейдер ставит нейтральные 50 баллов).

5. **Соберите и запустите:**

   ```bash
   docker compose up -d --build
   ```

   Первая сборка занимает 3–7 минут. Проверка:

   ```bash
   docker compose ps          # все три сервиса должны быть Up/healthy
   docker compose logs -f app # логи приложения
   ```

6. Откройте `https://ваш-домен` — Caddy получит сертификат при первом запросе.

## Обновление версии

```bash
git pull && docker compose up -d --build
```

База в volume `pgdata` — пересборка её не трогает.

## Что меняется относительно Vercel

- **Vercel Analytics** отключена вне Vercel (условие в `app/layout.tsx`).
- **AI-оценка** идёт через Vercel AI Gateway — вне Vercel нужен
  `AI_GATEWAY_API_KEY`. Сами запросы серверные (сервер → gateway), фильтрация
  мобильных операторов на них не влияет. Если захотите полностью уйти от
  Vercel-инфраструктуры, модель в `app/actions/grade-open-answers.ts` можно
  переключить на любой OpenAI-совместимый прокси/провайдер.
- **Письма** — Resend работает с любого хостинга, но для отправки со своего
  домена подтвердите его в панели Resend и задайте `RESULT_EMAIL_FROM`.
- **Прокторинг-события** хранятся в памяти процесса (как и раньше) — на одном
  долгоживущем контейнере это даже надёжнее, чем на serverless.

## Бэкап базы

```bash
docker compose exec db pg_dump -U skillproof skillproof > backup-$(date +%F).sql
```
