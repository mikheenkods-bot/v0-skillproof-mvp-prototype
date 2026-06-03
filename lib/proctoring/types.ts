// Типы для системы прокторинга

export type EventType = 
  | 'session_start'
  | 'session_end'
  | 'consent_given'
  | 'fullscreen_enter'
  | 'fullscreen_exit'
  | 'tab_hidden'
  | 'tab_visible'
  | 'focus_lost'
  | 'focus_gained'
  | 'window_resize'
  | 'multi_monitor_detected'
  | 'devtools_detected'
  | 'copy_attempt'
  | 'paste_attempt'
  | 'paste_detected'
  | 'cut_attempt'
  | 'context_menu'
  | 'keystroke'
  | 'typing_burst'
  | 'suspicious_input'
  | 'heartbeat'
  | 'heartbeat_missed'
  | 'answer_submitted'
  | 'browser_check_failed'
  | 'headless_detected'

export type EventSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export interface ProctoringEvent {
  id: string
  attemptId: string
  eventType: EventType
  severity: EventSeverity
  timestamp: number
  sequenceNumber: number
  previousHash: string
  currentHash: string
  metadata: Record<string, unknown>
  description: string
}

export interface SystemCheckResult {
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
}

export interface SessionState {
  attemptId: string
  userId: string
  specializationId: string
  startedAt: number
  consentGiven: boolean
  isFullscreen: boolean
  isActive: boolean
  isPaused: boolean
  isTerminated: boolean
  
  // Counters
  fullscreenExitCount: number
  tabSwitchCount: number
  focusLostCount: number
  windowResizeCount: number
  copyAttemptCount: number
  pasteAttemptCount: number
  devtoolsDetectedCount: number
  heartbeatMissedCount: number
  
  // Timestamps
  lastHeartbeat: number
  lastActivity: number
  totalTimeAway: number
  
  // Flags
  multiMonitorDetected: boolean
  headlessDetected: boolean
  
  // Events log
  events: ProctoringEvent[]
  
  // Integrity score (calculated server-side)
  integrityScore: number
  integrityLevel: 'green' | 'yellow' | 'red'
}

// Event weights for integrity score calculation
export const EVENT_WEIGHTS: Record<EventType, number> = {
  session_start: 0,
  session_end: 0,
  consent_given: 0,
  fullscreen_enter: 0,
  fullscreen_exit: 15,
  tab_hidden: 20,
  tab_visible: 0,
  focus_lost: 10,
  focus_gained: 0,
  window_resize: 5,
  multi_monitor_detected: 15,
  devtools_detected: 10,
  copy_attempt: 10,
  paste_attempt: 25,
  paste_detected: 30,
  cut_attempt: 10,
  context_menu: 5,
  keystroke: 0,
  typing_burst: 20,
  suspicious_input: 25,
  heartbeat: 0,
  heartbeat_missed: 15,
  answer_submitted: 0,
  browser_check_failed: 50,
  headless_detected: 100
}

// Thresholds for integrity levels
export const INTEGRITY_THRESHOLDS = {
  green: 30,   // 0-30 = green
  yellow: 70,  // 31-70 = yellow
  // 71+ = red
}

export interface TypingTelemetry {
  fieldId: string
  keystrokes: Array<{
    key: string
    timestamp: number
    interval: number // ms since last keystroke
  }>
  totalKeystrokes: number
  backspaceCount: number
  deleteCount: number
  pasteEvents: Array<{
    timestamp: number
    length: number
    textPreview: string // first 50 chars
  }>
  burstEvents: Array<{
    timestamp: number
    charCount: number
    duration: number
    method: 'keyboard' | 'paste' | 'unknown'
  }>
  averageInterval: number
  intervalVariance: number
  wordsPerMinute: number
  timeToFirstKeystroke: number
  focusLostBeforeBurst: boolean
}

export interface CorrelationEvent {
  timestamp: number
  type: 'focus_return_with_burst'
  timeAway: number
  burstSize: number
  confidence: number
}
