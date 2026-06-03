// Утилиты для системы прокторинга

import { EventType, EventSeverity, ProctoringEvent } from './types'

// Генерация уникального ID
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`
}

// Хеширование события для цепочки (append-only log integrity)
export async function hashEvent(event: Omit<ProctoringEvent, 'currentHash'>): Promise<string> {
  const data = JSON.stringify({
    id: event.id,
    attemptId: event.attemptId,
    eventType: event.eventType,
    timestamp: event.timestamp,
    sequenceNumber: event.sequenceNumber,
    previousHash: event.previousHash,
    metadata: event.metadata
  })
  
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// Определение severity по типу события
export function getEventSeverity(eventType: EventType): EventSeverity {
  const severityMap: Record<EventType, EventSeverity> = {
    session_start: 'info',
    session_end: 'info',
    consent_given: 'info',
    fullscreen_enter: 'info',
    fullscreen_exit: 'medium',
    tab_hidden: 'medium',
    tab_visible: 'info',
    focus_lost: 'low',
    focus_gained: 'info',
    window_resize: 'low',
    multi_monitor_detected: 'medium',
    devtools_detected: 'low',
    copy_attempt: 'medium',
    paste_attempt: 'high',
    paste_detected: 'high',
    cut_attempt: 'medium',
    context_menu: 'low',
    keystroke: 'info',
    typing_burst: 'high',
    suspicious_input: 'high',
    heartbeat: 'info',
    heartbeat_missed: 'medium',
    answer_submitted: 'info',
    browser_check_failed: 'critical',
    headless_detected: 'critical'
  }
  return severityMap[eventType]
}

// Системная проверка браузера
export function performSystemCheck(): {
  passed: boolean
  browser: string
  isHeadless: boolean
  isWebDriver: boolean
  hasMultipleMonitors: boolean
  screenWidth: number
  screenHeight: number
  windowWidth: number
  windowHeight: number
  userAgent: string
  platform: string
  languages: string[]
  cookiesEnabled: boolean
  doNotTrack: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Detect browser
  const ua = navigator.userAgent
  let browser = 'Unknown'
  if (ua.includes('Chrome')) browser = 'Chrome'
  else if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Safari')) browser = 'Safari'
  else if (ua.includes('Edge')) browser = 'Edge'
  
  // Check for WebDriver (Selenium, Puppeteer automation)
  const isWebDriver = !!(
    (navigator as Navigator & { webdriver?: boolean }).webdriver ||
    (window as Window & { __webdriver_script_fn?: unknown }).__webdriver_script_fn ||
    (window as Window & { __driver_evaluate?: unknown }).__driver_evaluate ||
    (window as Window & { __webdriver_evaluate?: unknown }).__webdriver_evaluate ||
    (window as Window & { __selenium_evaluate?: unknown }).__selenium_evaluate ||
    (window as Window & { __fxdriver_evaluate?: unknown }).__fxdriver_evaluate ||
    (window as Window & { __driver_unwrapped?: unknown }).__driver_unwrapped ||
    (window as Window & { __webdriver_unwrapped?: unknown }).__webdriver_unwrapped ||
    (window as Window & { __selenium_unwrapped?: unknown }).__selenium_unwrapped ||
    (window as Window & { __fxdriver_unwrapped?: unknown }).__fxdriver_unwrapped ||
    (window as Window & { _Selenium_IDE_Recorder?: unknown })._Selenium_IDE_Recorder ||
    (window as Window & { _selenium?: unknown })._selenium ||
    (window as Window & { calledSelenium?: unknown }).calledSelenium ||
    (document as Document & { __webdriver_script_func?: unknown }).__webdriver_script_func ||
    (document as Document & { $cdc_asdjflasutopfhvcZLmcfl_?: unknown }).$cdc_asdjflasutopfhvcZLmcfl_ ||
    (document as Document & { $chrome_asyncScriptInfo?: unknown }).$chrome_asyncScriptInfo
  )
  
  // Check for headless browser indicators
  const isHeadless = !!(
    /HeadlessChrome/.test(ua) ||
    !navigator.plugins?.length ||
    !navigator.languages?.length ||
    (navigator as Navigator & { webdriver?: boolean }).webdriver
  )
  
  // Check for multiple monitors (if Window Management API available)
  let hasMultipleMonitors = false
  if ('getScreenDetails' in window) {
    // Will be checked async separately
  } else if (window.screen) {
    // Heuristic: if screen is much larger than available, might have multiple
    hasMultipleMonitors = (window.screen as Screen & { isExtended?: boolean }).isExtended === true
  }
  
  if (isWebDriver) {
    errors.push('Обнаружена автоматизация браузера (WebDriver)')
  }
  
  if (isHeadless) {
    errors.push('Обнаружен headless-браузер')
  }
  
  return {
    passed: !isWebDriver && !isHeadless,
    browser,
    isHeadless,
    isWebDriver,
    hasMultipleMonitors,
    screenWidth: window.screen?.width || 0,
    screenHeight: window.screen?.height || 0,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    userAgent: ua,
    platform: navigator.platform,
    languages: Array.from(navigator.languages || []),
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1',
    errors
  }
}

// Проверка DevTools через размер окна
export function checkDevToolsOpen(): boolean {
  const widthThreshold = window.outerWidth - window.innerWidth > 160
  const heightThreshold = window.outerHeight - window.innerHeight > 160
  return widthThreshold || heightThreshold
}

// Проверка DevTools через debugger timing
export function checkDevToolsViaDebugger(): Promise<boolean> {
  return new Promise((resolve) => {
    const start = performance.now()
    // eslint-disable-next-line no-debugger
    debugger
    const end = performance.now()
    // If debugger is open, this will take significantly longer
    resolve(end - start > 100)
  })
}

// Форматирование времени
export function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// Расчет Integrity Score
export function calculateIntegrityScore(
  events: ProctoringEvent[],
  weights: Record<EventType, number>
): { score: number; level: 'green' | 'yellow' | 'red' } {
  let totalPenalty = 0
  
  for (const event of events) {
    totalPenalty += weights[event.eventType] || 0
  }
  
  // Cap at 100
  const score = Math.min(100, totalPenalty)
  
  let level: 'green' | 'yellow' | 'red' = 'green'
  if (score > 70) level = 'red'
  else if (score > 30) level = 'yellow'
  
  return { score, level }
}
