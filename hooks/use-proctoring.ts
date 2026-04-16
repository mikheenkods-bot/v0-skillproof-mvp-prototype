"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'

export interface ViolationType {
  type: 'tab_switch' | 'copy_attempt' | 'paste_attempt' | 'right_click' | 'fast_answer' | 'inactivity' | 'typing_speed'
  timestamp: Date
  description: string
}

export interface ProctoringState {
  isActive: boolean
  violations: ViolationType[]
  violationCount: number
  maxViolations: number
  isTerminated: boolean
  tabSwitchCount: number
  lastActivityTime: Date
  typingSpeed: number
  suspiciousActivities: string[]
}

interface UseProctoringOptions {
  maxViolations?: number
  inactivityTimeout?: number
  onViolation?: (violation: ViolationType) => void
  onTerminate?: () => void
}

export function useProctoring(options: UseProctoringOptions = {}) {
  const {
    maxViolations = 3,
    inactivityTimeout = 30000,
    onViolation,
    onTerminate
  } = options

  const [state, setState] = useState<ProctoringState>({
    isActive: false,
    violations: [],
    violationCount: 0,
    maxViolations,
    isTerminated: false,
    tabSwitchCount: 0,
    lastActivityTime: new Date(),
    typingSpeed: 0,
    suspiciousActivities: []
  })

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const typingStartRef = useRef<number | null>(null)
  const wordCountRef = useRef(0)

  const addViolation = useCallback((type: ViolationType['type'], description: string) => {
    const violation: ViolationType = {
      type,
      timestamp: new Date(),
      description
    }

    setState(prev => {
      const newCount = prev.violationCount + 1
      const isTerminated = newCount >= maxViolations

      if (isTerminated && onTerminate) {
        onTerminate()
      }

      return {
        ...prev,
        violations: [...prev.violations, violation],
        violationCount: newCount,
        isTerminated,
        tabSwitchCount: type === 'tab_switch' ? prev.tabSwitchCount + 1 : prev.tabSwitchCount
      }
    })

    if (onViolation) {
      onViolation(violation)
    }

    const remaining = maxViolations - state.violationCount - 1
    if (remaining > 0) {
      toast.warning(`Обнаружено нарушение: ${description}`, {
        description: `Осталось предупреждений: ${remaining}/${maxViolations}`
      })
    } else {
      toast.error('Тест завершен из-за нарушений', {
        description: 'Требуется пересдача под наблюдением'
      })
    }
  }, [maxViolations, onViolation, onTerminate, state.violationCount])

  const addSuspiciousActivity = useCallback((activity: string) => {
    setState(prev => ({
      ...prev,
      suspiciousActivities: [...prev.suspiciousActivities, activity]
    }))
    toast.info('Подозрительная активность', { description: activity })
  }, [])

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    setState(prev => ({ ...prev, lastActivityTime: new Date() }))
    
    inactivityTimerRef.current = setTimeout(() => {
      if (state.isActive && !state.isTerminated) {
        toast.warning('Вы неактивны более 30 секунд', {
          description: 'Продолжайте выполнение теста'
        })
      }
    }, inactivityTimeout)
  }, [inactivityTimeout, state.isActive, state.isTerminated])

  const startProctoring = useCallback(() => {
    setState(prev => ({ ...prev, isActive: true }))
    resetInactivityTimer()
  }, [resetInactivityTimer])

  const stopProctoring = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false }))
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
  }, [])

  const handleTyping = useCallback((text: string) => {
    if (!typingStartRef.current) {
      typingStartRef.current = Date.now()
      wordCountRef.current = 0
    }

    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length
    wordCountRef.current = words

    const elapsedMinutes = (Date.now() - typingStartRef.current) / 60000
    if (elapsedMinutes > 0.1) {
      const wpm = Math.round(words / elapsedMinutes)
      setState(prev => ({ ...prev, typingSpeed: wpm }))

      if (wpm > 120 && words > 20) {
        addSuspiciousActivity(`Высокая скорость печати: ${wpm} сл/мин`)
      }
    }

    resetInactivityTimer()
  }, [addSuspiciousActivity, resetInactivityTimer])

  const checkAnswerTiming = useCallback((questionComplexity: 'easy' | 'medium' | 'hard', timeSpent: number) => {
    const minTimes = { easy: 3000, medium: 5000, hard: 8000 }
    const minTime = minTimes[questionComplexity]

    if (timeSpent < minTime) {
      addSuspiciousActivity(`Слишком быстрый ответ (${Math.round(timeSpent / 1000)}с) на ${questionComplexity === 'hard' ? 'сложный' : questionComplexity === 'medium' ? 'средний' : 'легкий'} вопрос`)
    }
  }, [addSuspiciousActivity])

  useEffect(() => {
    if (!state.isActive || state.isTerminated) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        addViolation('tab_switch', 'Переключение на другую вкладку/окно')
      }
    }

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      addViolation('copy_attempt', 'Попытка копирования текста')
    }

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()
      addViolation('paste_attempt', 'Попытка вставки текста')
      toast.error('Вставка запрещена для обеспечения честности')
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      addViolation('right_click', 'Попытка открыть контекстное меню')
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      resetInactivityTimer()
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        addViolation('copy_attempt', 'Попытка копирования (Ctrl+C)')
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        addViolation('paste_attempt', 'Попытка вставки (Ctrl+V)')
        toast.error('Вставка запрещена для обеспечения честности')
      }
    }

    const handleMouseMove = () => {
      resetInactivityTimer()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousemove', handleMouseMove)
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [state.isActive, state.isTerminated, addViolation, resetInactivityTimer])

  return {
    ...state,
    startProctoring,
    stopProctoring,
    addViolation,
    addSuspiciousActivity,
    handleTyping,
    checkAnswerTiming,
    resetInactivityTimer
  }
}
