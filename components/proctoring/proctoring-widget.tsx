"use client"

import { Shield, Monitor, Chrome, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProctoringWidgetProps {
  isActive: boolean
  violations: number
  maxViolations: number
}

export function ProctoringWidget({ isActive, violations, maxViolations }: ProctoringWidgetProps) {
  const remaining = maxViolations - violations

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-50 rounded-xl border shadow-lg transition-all duration-300",
      isActive ? "glass-card" : "bg-muted/50",
      violations > 0 && violations < maxViolations && "border-warning",
      violations >= maxViolations && "border-destructive"
    )}>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full",
            isActive ? "bg-success/20" : "bg-muted",
            violations > 0 && "bg-warning/20",
            violations >= maxViolations && "bg-destructive/20"
          )}>
            <Shield className={cn(
              "h-4 w-4",
              isActive ? "text-success" : "text-muted-foreground",
              violations > 0 && "text-warning",
              violations >= maxViolations && "text-destructive"
            )} />
            {isActive && violations < maxViolations && (
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="proctoring-pulse absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success" />
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium">
              {isActive ? 'Защита активна' : 'Защита неактивна'}
            </p>
            <p className={cn(
              "text-xs",
              violations === 0 ? "text-muted-foreground" : "text-warning",
              violations >= maxViolations && "text-destructive"
            )}>
              Нарушений: {violations}/{maxViolations}
            </p>
          </div>
        </div>

        {isActive && (
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs">
              <Monitor className="h-3 w-3 text-success" />
              <span className="text-muted-foreground">Экран контролируется</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Chrome className="h-3 w-3 text-success" />
              <span className="text-muted-foreground">Браузер защищен</span>
            </div>
            {violations > 0 && (
              <div className="flex items-center gap-2 text-xs text-warning">
                <AlertTriangle className="h-3 w-3" />
                <span>Осталось предупреждений: {remaining}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
