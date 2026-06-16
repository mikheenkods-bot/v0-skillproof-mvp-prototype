/**
 * Безопасный флаг тестового режима для сквозных (E2E) автотестов.
 *
 * Включается ТОЛЬКО когда выполнены ОБА условия:
 *  1. NEXT_PUBLIC_E2E_TEST_MODE === 'true' | '1'  (явно задан в окружении)
 *  2. process.env.NODE_ENV !== 'production'        (никогда не на боевом билде)
 *
 * Обе переменные инлайнятся компилятором Next.js на этапе сборки, поэтому в
 * продакшен-бандле выражение схлопывается в `false` и весь «тестовый шов»
 * становится мёртвым кодом — его невозможно активировать на боевом домене,
 * даже если кто-то выставит NEXT_PUBLIC_E2E_TEST_MODE на проде.
 */
export const E2E_TEST_MODE: boolean =
  process.env.NODE_ENV !== 'production' &&
  (process.env.NEXT_PUBLIC_E2E_TEST_MODE === 'true' ||
    process.env.NEXT_PUBLIC_E2E_TEST_MODE === '1')
