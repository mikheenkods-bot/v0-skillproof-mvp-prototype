"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Shield, 
  Monitor, 
  Chrome, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Activity,
  Eye,
  Keyboard,
  Maximize
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { SessionState } from '@/lib/proctoring/types'

interface ProctoringWidgetProps {
  isActive: boolean
  violations?: number
  maxViolations?: number
  integrityScore?: number
  integrityLevel?: 'green' | 'yellow' | 'red'
  isFullscreen?: boolean
  tabSwitchCount?: number
  focusLostCount?: number
  state?: SessionState
}

export function ProctoringWidget({ 
  isActive, 
  violations = 0, 
  maxViolations = 5,
  integrityScore = 0,
  integrityLevel = 'green',
  isFullscreen = false,
  tabSwitchCount = 0,
  focusLostCount = 0,
  state
}: ProctoringWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Use state if provided
  const score = state?.integrityScore ?? integrityScore
  const level = state?.integrityLevel ?? integrityLevel
  const tabs = state?.tabSwitchCount ?? tabSwitchCount
  const focus = state?.focusLostCount ?? focusLostCount
  const fullscreen = state?.isFullscreen ?? isFullscreen
  const violationCount = state 
    ? (state.tabSwitchCount + state.fullscreenExitCount + state.copyAttemptCount + state.pasteAttemptCount)
    : violations

  const remaining = maxViolations - violationCount

  const levelColors = {
    green: {
      bg: 'bg-success/20',
      text: 'text-success',
      border: 'border-success/30',
      label: 'Чисто'
    },
    yellow: {
      bg: 'bg-warning/20',
      text: 'text-warning',
      border: 'border-warning/30',
      label: 'Внимание'
    },
    red: {
      bg: 'bg-destructive/20',
      text: 'text-destructive',
      border: 'border-destructive/30',
      label: 'Проблемы'
    }
  }

  const currentLevel = levelColors[level]

  return (
    <motion.div
      layout
      className={cn(
        "fixed bottom-4 right-4 z-50 rounded-xl border shadow-lg transition-all duration-300",
        "bg-card/95 backdrop-blur-sm",
        currentLevel.border
      )}
    >
      <div className="p-3">
        {/* Header - always visible */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2">
            <div className={cn(
              "relative flex h-8 w-8 items-center justify-center rounded-full",
              currentLevel.bg
            )}>
              <Shield className={cn("h-4 w-4", currentLevel.text)} />
              {isActive && level === 'green' && (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="proctoring-pulse absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
                </span>
              )}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">
                {isActive ? 'Прокторинг активен' : 'Прокторинг неактивен'}
              </p>
              <p className={cn("text-xs", currentLevel.text)}>
                {currentLevel.label} • Score: {score}
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 mt-3 border-t border-border/50 space-y-2">
                {/* Integrity Score Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Integrity Score</span>
                    <span className={currentLevel.text}>{score}/100</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      className={cn(
                        "h-full rounded-full",
                        level === 'green' && "bg-success",
                        level === 'yellow' && "bg-warning",
                        level === 'red' && "bg-destructive"
                      )}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <Eye className={cn(
                      "h-3 w-3",
                      tabs > 0 ? "text-warning" : "text-success"
                    )} />
                    <span className="text-muted-foreground">Вкладки:</span>
                    <span className="font-medium">{tabs}</span>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <Activity className={cn(
                      "h-3 w-3",
                      focus > 0 ? "text-warning" : "text-success"
                    )} />
                    <span className="text-muted-foreground">Фокус:</span>
                    <span className="font-medium">{focus}</span>
                  </div>
                </div>

                {/* Status indicators */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Maximize className={cn(
                      "h-3 w-3",
                      fullscreen ? "text-success" : "text-warning"
                    )} />
                    <span className="text-muted-foreground">
                      {fullscreen ? 'Полноэкранный режим' : 'Не в полноэкранном режиме'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Keyboard className="h-3 w-3 text-success" />
                    <span className="text-muted-foreground">Телеметрия ввода</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Chrome className="h-3 w-3 text-success" />
                    <span className="text-muted-foreground">Браузер защищен</span>
                  </div>
                </div>

                {/* Violations warning */}
                {violationCount > 0 && (
                  <div className="flex items-center gap-2 text-xs text-warning p-2 rounded-lg bg-warning/10">
                    <AlertTriangle className="h-3 w-3" />
                    <span>Нарушений: {violationCount} | Осталось: {remaining}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
