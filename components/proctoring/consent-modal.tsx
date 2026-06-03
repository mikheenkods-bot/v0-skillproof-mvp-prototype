"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Shield, 
  AlertTriangle, 
  Ban, 
  Eye, 
  Brain, 
  Monitor, 
  Chrome,
  CheckCircle2,
  XCircle,
  Loader2,
  Maximize
} from 'lucide-react'
import { SystemCheckResult } from '@/lib/proctoring/types'

interface ConsentModalProps {
  isOpen: boolean
  systemCheck: SystemCheckResult | null
  onRunSystemCheck: () => SystemCheckResult
  onAccept: () => void
  onClose: () => void
}

const consentItems = [
  {
    id: 'behavior',
    icon: Eye,
    title: 'Поведенческий мониторинг',
    description: 'Фиксация переключений вкладок, потери фокуса, изменения размера окна'
  },
  {
    id: 'clipboard',
    icon: Ban,
    title: 'Контроль буфера обмена',
    description: 'Отслеживание попыток копирования и вставки текста'
  },
  {
    id: 'typing',
    icon: Brain,
    title: 'Телеметрия ввода',
    description: 'Анализ паттернов набора текста для выявления использования ИИ'
  },
  {
    id: 'fullscreen',
    icon: Maximize,
    title: 'Полноэкранный режим',
    description: 'Тест проходит в полноэкранном режиме, выход фиксируется'
  }
]

export function ConsentModal({ 
  isOpen, 
  systemCheck, 
  onRunSystemCheck, 
  onAccept, 
  onClose 
}: ConsentModalProps) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})
  const [isChecking, setIsChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<SystemCheckResult | null>(systemCheck)

  const allAccepted = consentItems.every(item => accepted[item.id])

  useEffect(() => {
    if (isOpen && !checkResult) {
      runCheck()
    }
  }, [isOpen])

  const runCheck = async () => {
    setIsChecking(true)
    // Small delay to show loading state
    await new Promise(r => setTimeout(r, 1000))
    const result = onRunSystemCheck()
    setCheckResult(result)
    setIsChecking(false)
  }

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setAccepted(prev => ({ ...prev, [id]: checked }))
  }

  const handleAccept = () => {
    if (allAccepted && checkResult?.passed) {
      onAccept()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="bg-primary/10 p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Согласие на прокторинг</h2>
                  <p className="text-sm text-muted-foreground">
                    Ознакомьтесь с условиями и подтвердите согласие
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* System Check */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Monitor className="h-4 w-4" />
                  Проверка системы
                </h3>
                
                {isChecking ? (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm">Проверка браузера и системы...</span>
                  </div>
                ) : checkResult ? (
                  <div className={`p-4 rounded-lg border ${
                    checkResult.passed 
                      ? 'bg-success/10 border-success/20' 
                      : 'bg-destructive/10 border-destructive/20'
                  }`}>
                    <div className="flex items-start gap-3">
                      {checkResult.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className={`font-medium ${
                          checkResult.passed ? 'text-success' : 'text-destructive'
                        }`}>
                          {checkResult.passed 
                            ? 'Система готова к тестированию' 
                            : 'Обнаружены проблемы'}
                        </p>
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Chrome className="h-4 w-4" />
                            <span>Браузер: {checkResult.browser}</span>
                            {checkResult.isHeadless && (
                              <span className="text-destructive">(Headless)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            <span>Экран: {checkResult.screenWidth}x{checkResult.screenHeight}</span>
                            {checkResult.hasMultipleMonitors && (
                              <span className="text-warning">(Несколько мониторов)</span>
                            )}
                          </div>
                        </div>
                        {checkResult.errors.length > 0 && (
                          <ul className="mt-2 space-y-1 text-sm text-destructive">
                            {checkResult.errors.map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" onClick={runCheck} className="w-full">
                    Запустить проверку
                  </Button>
                )}
              </div>

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Важная информация</p>
                  <p className="text-muted-foreground mt-1">
                    Все действия во время теста записываются и анализируются. 
                    При многократных нарушениях тест будет завершен автоматически. 
                    Результаты проверки честности доступны работодателю.
                  </p>
                </div>
              </div>

              {/* Consent Items */}
              <div className="space-y-3">
                <h3 className="font-medium">Я даю согласие на:</h3>
                {consentItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={accepted[item.id] || false}
                      onCheckedChange={(checked) => handleCheckboxChange(item.id, checked as boolean)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{item.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Отмена
              </Button>
              <Button 
                onClick={handleAccept} 
                disabled={!allAccepted || !checkResult?.passed}
                className="flex-1"
              >
                Принять и начать
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
