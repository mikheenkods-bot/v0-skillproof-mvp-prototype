"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { 
  EventType, 
  ProctoringEvent, 
  SessionState, 
  SystemCheckResult,
  EVENT_WEIGHTS 
} from '@/lib/proctoring/types'
import { 
  generateId, 
  hashEvent, 
  getEventSeverity, 
  performSystemCheck,
  checkDevToolsOpen,
  calculateIntegrityScore
} from '@/lib/proctoring/utils'
import { 
  TypingAnalyzer, 
  TypingMetrics, 
  SuspiciousPattern,
  analyzeAnswerTiming 
} from '@/lib/proctoring/typing-analytics'
import { E2E_TEST_MODE } from '@/lib/e2e'

export interface UseProctoringV2Options {
  attemptId?: string
  userId?: string
  specializationId?: string
  maxViolations?: number
  heartbeatInterval?: number
  onViolation?: (event: ProctoringEvent) => void
  onTerminate?: () => void
  onStateChange?: (state: SessionState) => void
}

const INITIAL_STATE: SessionState = {
  attemptId: '',
  userId: '',
  specializationId: '',
  startedAt: 0,
  consentGiven: false,
  isFullscreen: false,
  isActive: false,
  isPaused: false,
  isTerminated: false,
  fullscreenExitCount: 0,
  tabSwitchCount: 0,
  focusLostCount: 0,
  windowResizeCount: 0,
  copyAttemptCount: 0,
  pasteAttemptCount: 0,
  devtoolsDetectedCount: 0,
  heartbeatMissedCount: 0,
  lastHeartbeat: 0,
  lastActivity: 0,
  totalTimeAway: 0,
  multiMonitorDetected: false,
  headlessDetected: false,
  events: [],
  integrityScore: 0,
  integrityLevel: 'green'
}

export function useProctoringV2(options: UseProctoringV2Options = {}) {
  const {
    attemptId = generateId(),
    userId = 'anonymous',
    specializationId = '',
    maxViolations = 5,
    heartbeatInterval = 10000,
    onViolation,
    onTerminate,
    onStateChange
  } = options

  const [state, setState] = useState<SessionState>({
    ...INITIAL_STATE,
    attemptId,
    userId,
    specializationId
  })
  
  const [systemCheck, setSystemCheck] = useState<SystemCheckResult | null>(null)
  const [fullscreenPaused, setFullscreenPaused] = useState(false)
  const [typingMetrics, setTypingMetrics] = useState<TypingMetrics | null>(null)
  
  const sequenceRef = useRef(0)
  const lastHashRef = useRef('genesis')
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null)
  const tabHiddenTimeRef = useRef<number | null>(null)
  const focusLostTimeRef = useRef<number | null>(null)
  const devtoolsCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastResizeRef = useRef({ width: 0, height: 0 })
  const typingAnalyzerRef = useRef<TypingAnalyzer>(new TypingAnalyzer())
  const questionStartTimeRef = useRef<number>(0)
  const lastTextRef = useRef<string>('')

  // Re-seed the session when the attemptId changes (e.g. a retake reuses the
  // same hook instance). A new attemptId means a brand-new attempt, so counters,
  // events and the hash chain must reset. Keyed ONLY on attemptId so unrelated
  // prop changes (specializationId, userId) never wipe an in-progress session.
  useEffect(() => {
    setState(prev => {
      if (prev.attemptId === attemptId) return prev
      sequenceRef.current = 0
      lastHashRef.current = 'genesis'
      return {
        ...INITIAL_STATE,
        attemptId,
        userId: prev.userId,
        specializationId: prev.specializationId,
        startedAt: Date.now(),
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId])

  // Create and log an event
  const logEvent = useCallback(async (
    eventType: EventType,
    metadata: Record<string, unknown> = {},
    description: string = ''
  ): Promise<ProctoringEvent> => {
    const seq = ++sequenceRef.current
    const eventId = generateId()
    
    const eventBase = {
      id: eventId,
      attemptId: state.attemptId,
      eventType,
      severity: getEventSeverity(eventType),
      timestamp: Date.now(),
      sequenceNumber: seq,
      previousHash: lastHashRef.current,
      metadata,
      description
    }
    
    const currentHash = await hashEvent(eventBase)
    lastHashRef.current = currentHash
    
    const event: ProctoringEvent = {
      ...eventBase,
      currentHash
    }
    
    setState(prev => {
      const newEvents = [...prev.events, event]
      const { score, level } = calculateIntegrityScore(newEvents, EVENT_WEIGHTS)
      
      const newState = {
        ...prev,
        events: newEvents,
        integrityScore: score,
        integrityLevel: level,
        lastActivity: Date.now()
      }
      
      onStateChange?.(newState)
      return newState
    })
    
    // Send to server (fire and forget for now)
    try {
      fetch('/api/proctoring/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(() => {})
    } catch {
      // Ignore network errors
    }
    
    if (onViolation && getEventSeverity(eventType) !== 'info') {
      onViolation(event)
    }
    
    return event
  }, [state.attemptId, onViolation, onStateChange])

  // Violation handler
  const addViolation = useCallback((
    eventType: EventType,
    metadata: Record<string, unknown> = {},
    description: string = ''
  ) => {
    logEvent(eventType, metadata, description)
    
    const severity = getEventSeverity(eventType)
    const severityColors = {
      info: '',
      low: '',
      medium: 'warning',
      high: 'error',
      critical: 'error'
    } as const
    
    if (severity === 'critical') {
      toast.error('Критическое нарушение', { description })
    } else if (severity === 'high') {
      toast.error('Нарушение', { description })
    } else if (severity === 'medium') {
      toast.warning('Предупреждение', { description })
    }
    
    // Check if should terminate.
    // В E2E-режиме прокторинг продолжает фиксировать события (поток честный),
    // но НЕ завершает тест принудительно — иначе автотест не дойдёт до конца.
    setState(prev => {
      const violationCount = prev.tabSwitchCount + prev.fullscreenExitCount + 
        prev.copyAttemptCount + prev.pasteAttemptCount
      
      if (!E2E_TEST_MODE && violationCount >= maxViolations && !prev.isTerminated) {
        onTerminate?.()
        return { ...prev, isTerminated: true, isActive: false }
      }
      return prev
    })
  }, [logEvent, maxViolations, onTerminate])

  // System check
  const runSystemCheck = useCallback(() => {
    const result = performSystemCheck()
    setSystemCheck(result)
    
    if (!result.passed) {
      logEvent('browser_check_failed', result, 'Проверка браузера не пройдена')
      if (result.isHeadless) {
        logEvent('headless_detected', {}, 'Обнаружен headless-браузер')
      }
    }
    
    if (result.hasMultipleMonitors) {
      setState(prev => ({ ...prev, multiMonitorDetected: true }))
      logEvent('multi_monitor_detected', {}, 'Обнаружено несколько мониторов')
    }
    
    return result
  }, [logEvent])

  // Consent
  const giveConsent = useCallback(() => {
    setState(prev => ({ ...prev, consentGiven: true }))
    logEvent('consent_given', {}, 'Согласие на прокторинг дано')
  }, [logEvent])

  // Start session
  const startSession = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: true,
      startedAt: Date.now(),
      lastHeartbeat: Date.now(),
      lastActivity: Date.now()
    }))
    logEvent('session_start', { 
      systemCheck,
      timestamp: Date.now()
    }, 'Сессия тестирования начата')
  }, [logEvent, systemCheck])

  // Stop session
  const stopSession = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false }))
    logEvent('session_end', {
      duration: Date.now() - state.startedAt,
      totalEvents: state.events.length,
      integrityScore: state.integrityScore
    }, 'Сессия тестирования завершена')
  }, [logEvent, state.startedAt, state.events.length, state.integrityScore])

  // Fullscreen management
  const enterFullscreen = useCallback(async () => {
    // В E2E-режиме полноэкранный режим НЕ обязателен: автоматизированный браузер
    // не может запросить fullscreen без жеста пользователя. Помечаем как «вошли»
    // только логически, чтобы поток не блокировался.
    if (E2E_TEST_MODE) {
      setState(prev => ({ ...prev, isFullscreen: true }))
      setFullscreenPaused(false)
      logEvent('fullscreen_enter', { e2e: true }, 'E2E: полноэкранный режим не требуется')
      return true
    }
    try {
      await document.documentElement.requestFullscreen()
      setState(prev => ({ ...prev, isFullscreen: true }))
      logEvent('fullscreen_enter', {}, 'Вход в полноэкранный режим')
      setFullscreenPaused(false)
      return true
    } catch (err) {
      console.error('Fullscreen error:', err)
      return false
    }
  }, [logEvent])

  const exitFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  // Heartbeat
  const sendHeartbeat = useCallback(() => {
    const now = Date.now()
    setState(prev => ({ ...prev, lastHeartbeat: now }))
    logEvent('heartbeat', { timestamp: now }, '')
    
    // Send to server
    fetch('/api/proctoring/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId: state.attemptId,
        timestamp: now,
        integrityScore: state.integrityScore
      })
    }).catch(() => {})
  }, [logEvent, state.attemptId, state.integrityScore])

  // Setup event listeners
  useEffect(() => {
    if (!state.isActive || state.isTerminated) return

    // Visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabHiddenTimeRef.current = Date.now()
        setState(prev => ({ ...prev, tabSwitchCount: prev.tabSwitchCount + 1 }))
        addViolation('tab_hidden', {}, 'Переключение на другую вкладку')
      } else {
        const timeAway = tabHiddenTimeRef.current 
          ? Date.now() - tabHiddenTimeRef.current 
          : 0
        setState(prev => ({ ...prev, totalTimeAway: prev.totalTimeAway + timeAway }))
        logEvent('tab_visible', { timeAway }, 'Возврат на вкладку')
        tabHiddenTimeRef.current = null
      }
    }

    // Focus/blur (window level)
    const handleBlur = () => {
      focusLostTimeRef.current = Date.now()
      setState(prev => ({ ...prev, focusLostCount: prev.focusLostCount + 1 }))
      addViolation('focus_lost', {}, 'Потеря фокуса окна')
    }

    const handleFocus = () => {
      const timeAway = focusLostTimeRef.current 
        ? Date.now() - focusLostTimeRef.current 
        : 0
      logEvent('focus_gained', { timeAway }, 'Фокус восстановлен')
      focusLostTimeRef.current = null
    }

    // Fullscreen change
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && state.isActive) {
        // В E2E-режиме выход из fullscreen фиксируется как событие (поток честный),
        // но НЕ считается нарушением и НЕ ставит тест на паузу.
        if (E2E_TEST_MODE) {
          logEvent('fullscreen_exit', { e2e: true }, 'E2E: выход из fullscreen (не блокирует)')
          return
        }
        setState(prev => ({ 
          ...prev, 
          isFullscreen: false,
          fullscreenExitCount: prev.fullscreenExitCount + 1 
        }))
        addViolation('fullscreen_exit', {}, 'Выход из полноэкранного режима')
        setFullscreenPaused(true)
      }
    }

    // Resize
    const handleResize = () => {
      const newWidth = window.innerWidth
      const newHeight = window.innerHeight
      
      if (lastResizeRef.current.width !== 0) {
        const widthDiff = Math.abs(newWidth - lastResizeRef.current.width)
        const heightDiff = Math.abs(newHeight - lastResizeRef.current.height)
        
        if (widthDiff > 100 || heightDiff > 100) {
          setState(prev => ({ ...prev, windowResizeCount: prev.windowResizeCount + 1 }))
          addViolation('window_resize', { 
            from: lastResizeRef.current,
            to: { width: newWidth, height: newHeight }
          }, 'Изменение размера окна (возможно разделение экрана)')
        }
      }
      
      lastResizeRef.current = { width: newWidth, height: newHeight }
    }

    // Copy/cut/paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      setState(prev => ({ ...prev, copyAttemptCount: prev.copyAttemptCount + 1 }))
      addViolation('copy_attempt', {}, 'Попытка копирования')
    }

    const handleCut = (e: ClipboardEvent) => {
      e.preventDefault()
      addViolation('cut_attempt', {}, 'Попытка вырезания')
    }

    const handlePaste = (e: ClipboardEvent) => {
      // Don't prevent - will be analyzed, but flag it
      const text = e.clipboardData?.getData('text') || ''
      setState(prev => ({ ...prev, pasteAttemptCount: prev.pasteAttemptCount + 1 }))
      addViolation('paste_attempt', { 
        length: text.length,
        preview: text.substring(0, 50)
      }, `Вставка текста (${text.length} символов)`)
    }

    // Context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      addViolation('context_menu', {}, 'Попытка открыть контекстное меню')
    }

    // Activity tracking
    const handleActivity = () => {
      setState(prev => ({ ...prev, lastActivity: Date.now() }))
    }

    // Initialize resize ref
    lastResizeRef.current = { width: window.innerWidth, height: window.innerHeight }

    // Add listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('resize', handleResize)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('cut', handleCut)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleActivity)
    document.addEventListener('mousemove', handleActivity)

    // Heartbeat timer
    heartbeatTimerRef.current = setInterval(sendHeartbeat, heartbeatInterval)

    // DevTools check interval
    devtoolsCheckIntervalRef.current = setInterval(() => {
      if (checkDevToolsOpen()) {
        setState(prev => {
          if (prev.devtoolsDetectedCount === 0) {
            addViolation('devtools_detected', {}, 'Возможно открыты инструменты разработчика')
          }
          return { ...prev, devtoolsDetectedCount: prev.devtoolsDetectedCount + 1 }
        })
      }
    }, 2000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('cut', handleCut)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleActivity)
      document.removeEventListener('mousemove', handleActivity)
      
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current)
      }
      if (devtoolsCheckIntervalRef.current) {
        clearInterval(devtoolsCheckIntervalRef.current)
      }
    }
  }, [state.isActive, state.isTerminated, addViolation, logEvent, sendHeartbeat, heartbeatInterval])

  // === Typing Analytics Methods ===
  
  /**
   * Record a keystroke for typing pattern analysis
   */
  const recordKeystroke = useCallback((key: string) => {
    if (!state.isActive || state.isTerminated) return
    typingAnalyzerRef.current.recordKeystroke(key)
  }, [state.isActive, state.isTerminated])

  /**
   * Record text change and detect copy-paste
   */
  const recordTextChange = useCallback((newText: string) => {
    if (!state.isActive || state.isTerminated) return
    
    const suspiciousPatterns = typingAnalyzerRef.current.recordTextChange(newText)
    
    // Log suspicious patterns as violations
    for (const pattern of suspiciousPatterns) {
      if (pattern.severity === 'high') {
        addViolation('paste_attempt', pattern.evidence, pattern.description)
      } else if (pattern.severity === 'medium') {
        logEvent('paste_attempt', pattern.evidence, pattern.description)
        toast.warning('Подозрительный ввод', { description: pattern.description })
      }
    }
    
    lastTextRef.current = newText
    
    // Update metrics periodically
    setTypingMetrics(typingAnalyzerRef.current.getMetrics())
  }, [state.isActive, state.isTerminated, addViolation, logEvent])

  /**
   * Handle keydown event for typing analysis
   */
  const handleTypingKeydown = useCallback((e: KeyboardEvent) => {
    recordKeystroke(e.key)
  }, [recordKeystroke])

  /**
   * Start timing for a new question
   */
  const startQuestionTimer = useCallback(() => {
    questionStartTimeRef.current = Date.now()
    typingAnalyzerRef.current.reset()
    lastTextRef.current = ''
  }, [])

  /**
   * Check answer timing and return analysis
   * Note: Only logs suspicious timing, does NOT add violation (user might just be fast)
   */
  const checkAnswerTiming = useCallback((
    complexity: string,
    questionTextLength: number
  ) => {
    const answerTime = Date.now() - questionStartTimeRef.current
    const result = analyzeAnswerTiming(complexity, answerTime, questionTextLength)
    
    // Only log suspicious timing, don't add violation - user might be smart/fast
    if (result.isSuspicious && result.reason) {
      logEvent('suspicious_timing', {
        complexity,
        answerTimeMs: answerTime,
        expectedMinTimeMs: result.expectedMinTime,
        isSuspicious: true,
      }, result.reason)
    }
    
    return result
  }, [logEvent])

  /**
   * Get final typing metrics for the current session
   */
  const getTypingAnalysis = useCallback((): TypingMetrics | null => {
    return typingAnalyzerRef.current.getMetrics()
  }, [])

  /**
   * Get suspicious patterns detected
   */
  const getSuspiciousPatterns = useCallback((): SuspiciousPattern[] => {
    const metrics = typingAnalyzerRef.current.getMetrics()
    return metrics.suspiciousPatterns
  }, [])

  // Memoize violations array to prevent infinite re-renders
  const violations = useMemo(() => 
    state.events.filter(e => getEventSeverity(e.eventType) !== 'info'),
    [state.events]
  )

  const violationCount = state.tabSwitchCount + state.fullscreenExitCount + 
    state.copyAttemptCount + state.pasteAttemptCount

  return {
    state,
    systemCheck,
    fullscreenPaused,
    typingMetrics,
    runSystemCheck,
    giveConsent,
    startSession,
    stopSession,
    enterFullscreen,
    exitFullscreen,
    logEvent,
    addViolation,
    
    // Typing analytics methods
    recordKeystroke,
    recordTextChange,
    handleTypingKeydown,
    startQuestionTimer,
    checkAnswerTiming,
    getTypingAnalysis,
    getSuspiciousPatterns,
    
    // Legacy compatibility
    isActive: state.isActive,
    violations,
    violationCount,
    maxViolations,
    isTerminated: state.isTerminated,
    tabSwitchCount: state.tabSwitchCount,
    integrityScore: state.integrityScore,
    integrityLevel: state.integrityLevel
  }
}
