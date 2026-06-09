"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
  Maximize,
  Keyboard,
  Clock,
  MousePointer,
  Copy,
  Camera,
  Mic,
  Wifi,
  Fingerprint,
  Zap,
  Activity,
  FileWarning,
  Lock
} from 'lucide-react'
import { SystemCheckResult } from '@/lib/proctoring/types'
import { cn } from '@/lib/utils'

interface ConsentModalProps {
  isOpen: boolean
  systemCheck: SystemCheckResult | null
  onRunSystemCheck: () => SystemCheckResult
  onAccept: (withCamera: boolean, withMic: boolean) => void
  onClose: () => void
}

// All proctoring checks with explanations
const proctoringChecks = [
  {
    category: 'Поведенческий мониторинг',
    icon: Eye,
    color: 'text-blue-500',
    checks: [
      { name: 'Переключение вкладок', description: 'Фиксируем каждый раз, когда вы покидаете вкладку теста' },
      { name: 'Потеря фокуса окна', description: 'Отслеживаем переход в другие приложения' },
      { name: 'Полноэкранный режим', description: 'Тест проходит только в fullscreen, выход = нарушение' },
      { name: 'Изменение размера окна', description: 'Подозрительные изменения размера фиксируются' },
    ]
  },
  {
    category: 'Анализ ввода текста',
    icon: Keyboard,
    color: 'text-purple-500',
    checks: [
      { name: 'Скорость печати (WPM)', description: 'Анализируем вашу скорость — слишком быстро = подозрительно' },
      { name: 'Паттерны нажатий', description: 'Изучаем ритм и паузы между нажатиями клавиш' },
      { name: 'Бёрсты ввода', description: 'Резкие всплески скорости печати фиксируются' },
      { name: 'Детектор copy-paste', description: 'Прыжки текста >50 символов = вставка из буфера' },
    ]
  },
  {
    category: 'Защита от ChatGPT/AI',
    icon: Brain,
    color: 'text-orange-500',
    checks: [
      { name: 'Время ответа', description: 'Слишком быстрые ответы на сложные вопросы = подозрение' },
      { name: 'Однородность текста', description: 'AI пишет слишком "гладко" — мы это видим' },
      { name: 'Паузы в наборе', description: 'Долгие паузы + резкий ввод = возможно копирование' },
      { name: 'Сравнение с эталоном', description: 'Ваш стиль печати сравнивается с началом теста' },
    ]
  },
  {
    category: 'Буфер обмена',
    icon: Copy,
    color: 'text-red-500',
    checks: [
      { name: 'Ctrl+C / Ctrl+V', description: 'Все попытки копирования и вставки логируются' },
      { name: 'Контекстное меню', description: 'Правый клик отключен и фиксируется' },
      { name: 'Drag & Drop', description: 'Перетаскивание текста отслеживается' },
    ]
  },
  {
    category: 'Техническая защита',
    icon: Monitor,
    color: 'text-green-500',
    checks: [
      { name: 'DevTools детектор', description: 'Открытие инструментов разработчика = нарушение' },
      { name: 'Несколько мониторов', description: 'Определяем наличие второго экрана' },
      { name: 'Headless браузер', description: 'Автоматизированные браузеры блокируются' },
      { name: 'Heartbeat', description: 'Проверяем активность каждые 30 секунд' },
    ]
  }
]

const optionalChecks = [
  {
    id: 'camera',
    icon: Camera,
    title: 'Веб-камера',
    description: 'Фото при каждом нарушении + проверка присутствия',
    badge: 'Рекомендуется',
    badgeVariant: 'default' as const
  },
  {
    id: 'microphone',
    icon: Mic,
    title: 'Микрофон',
    description: 'Детектирование голоса и посторонних звуков',
    badge: 'Опционально',
    badgeVariant: 'secondary' as const
  }
]

export function ConsentModal({ 
  isOpen, 
  systemCheck, 
  onRunSystemCheck, 
  onAccept, 
  onClose 
}: ConsentModalProps) {
  const [step, setStep] = useState<'intro' | 'checks' | 'permissions'>('intro')
  const [accepted, setAccepted] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<SystemCheckResult | null>(systemCheck)
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const [requestingCamera, setRequestingCamera] = useState(false)
  const [requestingMic, setRequestingMic] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Bind the camera stream to the <video> element AFTER it has been rendered.
  // Setting srcObject inside the request handler races the render: the <video>
  // is only mounted once cameraEnabled && cameraStream are true, so the ref is
  // still null at that point and the preview stays black.
  useEffect(() => {
    const video = videoRef.current
    if (video && cameraStream) {
      video.srcObject = cameraStream
      // Some browsers need an explicit play() call when srcObject is set late.
      video.play().catch(() => {})
    }
  }, [cameraStream, cameraEnabled])

  useEffect(() => {
    if (isOpen && step === 'permissions' && !checkResult) {
      runCheck()
    }
  }, [isOpen, step])

  useEffect(() => {
    // Cleanup camera stream on unmount
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [cameraStream])

  const runCheck = async () => {
    setIsChecking(true)
    await new Promise(r => setTimeout(r, 1000))
    const result = onRunSystemCheck()
    setCheckResult(result)
    setIsChecking(false)
  }

  const requestCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 320, height: 240 } 
      })
      setCameraStream(stream)
      setCameraEnabled(true)
      setCameraError(null)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setCameraError('Не удалось получить доступ к камере')
      setCameraEnabled(false)
    }
  }, [])

  const requestMicrophone = useCallback(async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      setMicEnabled(true)
    } catch {
      setMicEnabled(false)
    }
  }, [])

  const handleAccept = () => {
    if (accepted && checkResult) {
      // Allow continuing even with warnings - just needs checkbox and system check done
      onAccept(cameraEnabled, micEnabled)
    }
  }

  const renderIntro = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Hero Warning */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-6 border border-primary/30">
        <div className="absolute top-0 right-0 opacity-10">
          <Shield className="h-32 w-32 -mt-8 -mr-8" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Fingerprint className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered Proctoring</span>
          </div>
          <h3 className="text-2xl font-bold mb-2">
            Система честного тестирования
          </h3>
          <p className="text-muted-foreground">
            Наша система использует 20+ методов верификации для обеспечения 
            честности прохождения. Попытки обмана будут обнаружены.
          </p>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-4 rounded-lg bg-muted/50 border border-border">
          <div className="text-2xl font-bold text-primary">20+</div>
          <div className="text-xs text-muted-foreground">Проверок</div>
        </div>
        <div className="text-center p-4 rounded-lg bg-muted/50 border border-border">
          <div className="text-2xl font-bold text-orange-500">AI</div>
          <div className="text-xs text-muted-foreground">Детектор</div>
        </div>
        <div className="text-center p-4 rounded-lg bg-muted/50 border border-border">
          <div className="text-2xl font-bold text-green-500">100%</div>
          <div className="text-xs text-muted-foreground">Логирование</div>
        </div>
      </div>

      {/* Main Warning */}
      <div className="flex items-start gap-4 p-4 rounded-lg bg-destructive/10 border border-destructive/30">
        <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-destructive">Внимание!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Мы анализируем даже <strong>скорость вашей печати</strong> и <strong>паттерны нажатий клавиш</strong>. 
            Использование ChatGPT, копирование из других источников или помощь третьих лиц 
            будет обнаружено. Результаты проверки честности видны работодателю.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Не сейчас
        </Button>
        <Button onClick={() => setStep('checks')} className="flex-1">
          Посмотреть все проверки
        </Button>
      </div>
    </motion.div>
  )

  const renderChecks = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <Activity className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Что мы отслеживаем</h3>
      </div>

      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
        {proctoringChecks.map((category, idx) => (
          <div key={idx} className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center gap-2 p-3 bg-muted/50">
              <category.icon className={cn("h-4 w-4", category.color)} />
              <span className="font-medium text-sm">{category.category}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {category.checks.length} проверок
              </Badge>
            </div>
            <div className="divide-y divide-border">
              {category.checks.map((check, checkIdx) => (
                <div key={checkIdx} className="p-3 flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Warning */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
        <Zap className="h-5 w-5 text-orange-500" />
        <p className="text-sm">
          <strong>Integrity Score</strong> — итоговый показатель честности от 0 до 100%. 
          Работодатель видит этот показатель вместе с результатами теста.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('intro')}>
          Назад
        </Button>
        <Button onClick={() => setStep('permissions')} className="flex-1">
          Понял, продолжить
        </Button>
      </div>
    </motion.div>
  )

  const renderPermissions = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* System Check */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Проверка системы</h3>
        </div>
        
        {isChecking ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm">Проверка браузера и системы...</span>
          </div>
        ) : checkResult ? (
          <div className={cn(
            "p-4 rounded-lg border",
            checkResult.passed 
              ? "bg-success/10 border-success/30" 
              : "bg-destructive/10 border-destructive/30"
          )}>
            <div className="flex items-start gap-3">
              {checkResult.passed ? (
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0" />
              )}
              <div className="flex-1">
                <p className={cn(
                  "font-medium",
                  checkResult.passed ? "text-success" : "text-destructive"
                )}>
                  {checkResult.passed ? 'Система готова' : 'Обнаружены проблемы'}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Chrome className="h-3 w-3" />
                    <span>{checkResult.browser}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Monitor className="h-3 w-3" />
                    <span>{checkResult.screenWidth}x{checkResult.screenHeight}</span>
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

      {/* Optional: Camera & Mic */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          <h3 className="font-medium">Дополнительная верификация</h3>
          <Badge variant="outline" className="text-xs">Опционально</Badge>
        </div>

        <div className="grid gap-3">
          {/* Camera */}
          <div className={cn(
            "p-4 rounded-lg border transition-colors",
            cameraEnabled ? "border-green-500/50 bg-green-500/5" : "border-border"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                cameraEnabled ? "bg-green-500/20" : "bg-muted"
              )}>
                <Camera className={cn(
                  "h-5 w-5",
                  cameraEnabled ? "text-green-500" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Веб-камера</span>
                  <Badge variant="default" className="text-xs">Рекомендуется</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Фото при нарушениях, проверка присутствия человека
                </p>
                {cameraEnabled && cameraStream && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-green-500/30 w-40">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-auto"
                    />
                  </div>
                )}
                {cameraError && (
                  <p className="text-sm text-destructive mt-2">{cameraError}</p>
                )}
              </div>
              <Button
                variant={cameraEnabled ? "secondary" : "outline"}
                size="sm"
                onClick={cameraEnabled ? () => {
                  cameraStream?.getTracks().forEach(t => t.stop())
                  setCameraStream(null)
                  setCameraEnabled(false)
                } : requestCamera}
              >
                {cameraEnabled ? 'Отключить' : 'Включить'}
              </Button>
            </div>
          </div>

          {/* Microphone */}
          <div className={cn(
            "p-4 rounded-lg border transition-colors",
            micEnabled ? "border-green-500/50 bg-green-500/5" : "border-border"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                micEnabled ? "bg-green-500/20" : "bg-muted"
              )}>
                <Mic className={cn(
                  "h-5 w-5",
                  micEnabled ? "text-green-500" : "text-muted-foreground"
                )} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Микрофон</span>
                  <Badge variant="secondary" className="text-xs">Опционально</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Детектирование голоса и посторонних звуков
                </p>
              </div>
              <Button
                variant={micEnabled ? "secondary" : "outline"}
                size="sm"
                onClick={micEnabled ? () => setMicEnabled(false) : requestMicrophone}
              >
                {micEnabled ? 'Отключить' : 'Включить'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Final Consent */}
      <label className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
        <Checkbox
          checked={accepted}
          onCheckedChange={(checked) => setAccepted(checked as boolean)}
          className="mt-0.5"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <span className="font-medium">Я подтверждаю согласие</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Я понимаю, что все мои действия записываются, результаты проверки честности 
            будут видны работодателю, и обязуюсь проходить тест самостоятельно.
          </p>
        </div>
      </label>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('checks')}>
          Назад
        </Button>
        <Button 
          onClick={handleAccept} 
          disabled={!accepted || !checkResult}
          className="flex-1"
        >
          <Shield className="h-4 w-4 mr-2" />
          Начать тест
        </Button>
      </div>
    </motion.div>
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full max-w-xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/20">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">SkillVerify Proctoring</h2>
                  <p className="text-sm text-muted-foreground">
                    {step === 'intro' && 'Система честного тестирования'}
                    {step === 'checks' && 'Полный список проверок'}
                    {step === 'permissions' && 'Разрешения и согласие'}
                  </p>
                </div>
              </div>
              
              {/* Progress */}
              <div className="flex gap-1 mt-4">
                {['intro', 'checks', 'permissions'].map((s, i) => (
                  <div 
                    key={s}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      ['intro', 'checks', 'permissions'].indexOf(step) >= i 
                        ? "bg-primary" 
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {step === 'intro' && renderIntro()}
                {step === 'checks' && renderChecks()}
                {step === 'permissions' && renderPermissions()}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
