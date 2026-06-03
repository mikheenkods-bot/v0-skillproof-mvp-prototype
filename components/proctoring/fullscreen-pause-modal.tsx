"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Maximize, AlertTriangle, Pause } from 'lucide-react'

interface FullscreenPauseModalProps {
  isOpen: boolean
  exitCount: number
  maxExits?: number
  onReturnToFullscreen: () => void
}

export function FullscreenPauseModal({ 
  isOpen, 
  exitCount,
  maxExits = 3,
  onReturnToFullscreen 
}: FullscreenPauseModalProps) {
  const remaining = maxExits - exitCount

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className="w-full max-w-md rounded-2xl bg-card border border-warning shadow-2xl overflow-hidden"
          >
            <div className="bg-warning/20 p-6 border-b border-warning/30">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/20">
                  <Pause className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Тест приостановлен</h2>
                  <p className="text-sm text-muted-foreground">
                    Вы вышли из полноэкранного режима
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">
                    Нарушение зафиксировано
                  </p>
                  <p className="text-muted-foreground mt-1">
                    Выход из полноэкранного режима считается нарушением правил тестирования. 
                    Это событие записано в журнал и будет видно работодателю.
                  </p>
                </div>
              </div>

              <div className="text-center py-4">
                <div className="text-4xl font-bold text-warning mb-2">
                  {exitCount}/{maxExits}
                </div>
                <p className="text-sm text-muted-foreground">
                  {remaining > 0 
                    ? `Осталось предупреждений: ${remaining}` 
                    : 'Последнее предупреждение!'}
                </p>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Для продолжения тестирования вернитесь в полноэкранный режим
              </p>
            </div>

            <div className="p-6 border-t border-border bg-muted/30">
              <Button 
                onClick={onReturnToFullscreen}
                className="w-full"
                size="lg"
              >
                <Maximize className="mr-2 h-5 w-5" />
                Вернуться в полноэкранный режим
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
