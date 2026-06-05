"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { ConsentModal } from '@/components/proctoring/consent-modal'
import { FullscreenPauseModal } from '@/components/proctoring/fullscreen-pause-modal'
import { CertificateCard } from '@/components/certificate/certificate-card'
import { useProctoringV2 } from '@/hooks/use-proctoring-v2'
import { useProctoringMedia } from '@/hooks/use-proctoring-media'
import { 
  specializations, 
  getQuestionsForSpecialization, 
  getAIQuestionsForSpecialization,
  checkTestPassed,
  type SpecializationType 
} from '@/lib/demo-data'
import { cn } from '@/lib/utils'
import {
  Shield,
  Building2,
  Calculator,
  Users,
  Clock,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  MessageSquare,
  Send,
  Loader2,
  Brain,
  XCircle,
  ArrowLeft,
  Info,
  Camera
} from 'lucide-react'

type Stage = 'consent' | 'preparation' | 'specialization' | 'testing' | 'ai-interview' | 'analyzing' | 'result'

const preparationChecklist = [
  { id: 'programs', label: 'Закройте все сторонние программы', description: 'Мессенджеры, браузерные расширения AI' },
  { id: 'tabs', label: 'Закройте лишние вкладки браузера', description: 'Оставьте только эту вкладку' },
  { id: 'alone', label: 'Убедитесь, что вы одни в комнате', description: 'Для честного прохождения теста' }
]

export default function SkillProofPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('consent')
  const [specialization, setSpecialization] = useState<SpecializationType | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [showConsentModal, setShowConsentModal] = useState(true)
  const [preparationChecks, setPreparationChecks] = useState<Record<string, boolean>>({})
  const [timeRemaining, setTimeRemaining] = useState(30 * 60)
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const [currentInterviewQuestion, setCurrentInterviewQuestion] = useState(0)
  const [interviewAnswer, setInterviewAnswer] = useState('')
  const [interviewAnswers, setInterviewAnswers] = useState<string[]>([])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0)
  const [shake, setShake] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isAnswerLocked, setIsAnswerLocked] = useState(false)
  const [mediaEnabled, setMediaEnabled] = useState({ camera: false, mic: false })
  const [lastSnapshotReason, setLastSnapshotReason] = useState<string | undefined>()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get questions and AI interview questions for selected specialization
  const questions = specialization ? getQuestionsForSpecialization(specialization) : []
  const aiQuestions = specialization ? getAIQuestionsForSpecialization(specialization) : []
  const specConfig = specialization ? specializations[specialization] : null

  // New proctoring v2 system
  const proctoring = useProctoringV2({
    attemptId: `skillproof-${Date.now()}`,
    userId: 'current-user',
    specializationId: specialization || 'general',
    maxViolations: 3,
    onTerminate: () => {
      // Take snapshot on termination
      if (mediaEnabled.camera) {
        media.takeViolationSnapshot('Тест прерван из-за нарушений')
      }
      setStage('result')
      setFinalScore(0)
    }
  })

  // Media (camera & microphone) for proctoring
  const media = useProctoringMedia({
    onViolationSnapshot: (imageData, reason) => {
      setLastSnapshotReason(reason)
      // Clear after 3 seconds
      setTimeout(() => setLastSnapshotReason(undefined), 3000)
      // Log the snapshot event
      proctoring.logEvent('session_start', { hasSnapshot: true, reason }, `Фото при нарушении: ${reason}`)
    },
    onSpeechDetected: () => {
      // Optional: log speech detection as suspicious
      // proctoring.logEvent('suspicious_input', { type: 'speech' }, 'Обнаружена речь')
    }
  })

  // Timer effect
  useEffect(() => {
    if (stage !== 'testing' && stage !== 'ai-interview') return
    if (proctoring.isTerminated) return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setStage('analyzing')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [stage, proctoring.isTerminated])

  // Analysis effect - calculate real score and save to localStorage
  useEffect(() => {
    if (stage !== 'analyzing') return

    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          // Calculate real score based on correct answers
          let correct = 0
          questions.forEach((q) => {
            if (q.type === 'multiple_choice' && answers[q.id] === q.correctAnswer) {
              correct++
            }
          })
          setCorrectAnswersCount(correct)
          const score = Math.round((correct / questions.length) * 100)
          setFinalScore(score)
          
          // Check if passed (4 out of 5 correct)
          const passed = specialization ? checkTestPassed(specialization, correct) : false
          const isClean = proctoring.violations.length === 0
          
          // Save results to localStorage for profile
          const now = new Date()
          const dateStr = now.toLocaleDateString('ru-RU')
          const certId = `SKILL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
          
          // Generate skills based on questions
          const skillCategories = [...new Set(questions.map(q => q.category))]
          const skills = skillCategories.map(cat => {
            const catQuestions = questions.filter(q => q.category === cat)
            const catCorrect = catQuestions.filter(q => answers[q.id] === q.correctAnswer).length
            return {
              name: cat,
              score: Math.round((catCorrect / catQuestions.length) * 100)
            }
          })
          
          // Save certificate if passed
          if (passed) {
            const certificate = {
              id: certId,
              specialization: specConfig?.name || 'Общий тест',
              score,
              isClean,
              date: dateStr,
              skills,
              violations: proctoring.violations.length
            }
            
            const existingCerts = JSON.parse(localStorage.getItem('skillverify_certificates') || '[]')
            existingCerts.push(certificate)
            localStorage.setItem('skillverify_certificates', JSON.stringify(existingCerts))
          }
          
          // Save proctoring history
          const proctoringSession = {
            id: `proc-${Date.now()}`,
            date: dateStr,
            type: 'SkillProof',
            specialization: specConfig?.name || 'Общий тест',
            status: isClean ? 'clean' : 'violations',
            violations: proctoring.violations.length
          }
          
          const existingProctoring = JSON.parse(localStorage.getItem('skillverify_proctoring_history') || '[]')
          existingProctoring.push(proctoringSession)
          localStorage.setItem('skillverify_proctoring_history', JSON.stringify(existingProctoring))
          
          setTimeout(() => {
            setStage('result')
            if (isClean && passed) {
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              })
            }
          }, 500)
          return 100
        }
        return prev + 2
      })
    }, 100)

    return () => clearInterval(interval)
  }, [stage, answers, questions, proctoring.violations.length, specialization, specConfig?.name, proctoring.violations])

  // Shake effect on violation + take snapshot (with debounce)
  const lastViolationCountRef = useRef(0)
  useEffect(() => {
    const currentCount = proctoring.violations.length
    // Only trigger shake if violation count actually increased
    if (currentCount > lastViolationCountRef.current) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      
      // Take snapshot on violation if camera is enabled
      if (mediaEnabled.camera && media.cameraState.isEnabled) {
        const lastViolation = proctoring.violations[proctoring.violations.length - 1]
        media.takeViolationSnapshot(lastViolation?.description || 'Нарушение')
      }
    }
    lastViolationCountRef.current = currentCount
  }, [proctoring.violations.length, proctoring.violations, mediaEnabled.camera, media])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle consent acceptance with camera/mic options
  const handleConsentAccept = async (withCamera: boolean, withMic: boolean) => {
    setMediaEnabled({ camera: withCamera, mic: withMic })
    
    // Enable camera if user agreed
    if (withCamera) {
      await media.enableCamera()
    }
    
    // Enable microphone if user agreed
    if (withMic) {
      await media.enableMicrophone()
    }
    
    proctoring.giveConsent()
    proctoring.startSession()
    setShowConsentModal(false)
    setStage('preparation')
  }

  const handleStartTest = () => {
    // Request fullscreen when starting test
    proctoring.enterFullscreen()
    proctoring.startQuestionTimer() // Start timing for first question
    setStage('testing')
    setQuestionStartTime(Date.now())
  }

  const handleAnswer = (questionId: string, answer: number | string) => {
    if (isAnswerLocked) return // Prevent changing answer after submission
    
    const question = questions[currentQuestion]
    
    if (question.type === 'multiple_choice') {
      // Check answer timing using proctoring's typing analytics
      proctoring.checkAnswerTiming(question.complexity, question.text.length)
      setAnswers(prev => ({ ...prev, [questionId]: answer }))
      // Lock answer and show explanation
      setIsAnswerLocked(true)
      setShowExplanation(true)
    } else {
      setAnswers(prev => ({ ...prev, [questionId]: answer }))
    }
  }

  const handleNextQuestion = () => {
    setShowExplanation(false)
    setIsAnswerLocked(false)
    proctoring.startQuestionTimer() // Reset timer for next question
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setQuestionStartTime(Date.now())
    } else {
      setStage('ai-interview')
    }
  }

  const handleInterviewSubmit = () => {
    if (!interviewAnswer.trim()) return
    
    // Record text for analysis before submitting
    proctoring.recordTextChange(interviewAnswer)
    
    setInterviewAnswers(prev => [...prev, interviewAnswer])
    setInterviewAnswer('')
    proctoring.startQuestionTimer() // Reset for next question
    
    if (currentInterviewQuestion < aiQuestions.length - 1) {
      setCurrentInterviewQuestion(prev => prev + 1)
    } else {
      proctoring.stopSession()
      setStage('analyzing')
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInterviewAnswer(e.target.value)
    // Record text change for copy-paste detection
    proctoring.recordTextChange(e.target.value)
  }

  // Handle keydown for typing pattern analysis
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    proctoring.recordKeystroke(e.key)
  }

  const allChecked = preparationChecklist.every(item => preparationChecks[item.id])

  return (
    <div className={cn("min-h-screen bg-background", shake && "shake")}>
      <Header />
      
      {/* Consent Modal */}
      <ConsentModal
        isOpen={showConsentModal && stage === 'consent'}
        onAccept={handleConsentAccept}
        onClose={() => {
          setShowConsentModal(false)
          router.push('/')
        }}
        systemCheck={proctoring.systemCheck}
        onRunSystemCheck={proctoring.runSystemCheck}
      />

      {/* Fullscreen Pause Modal */}
      <FullscreenPauseModal
        isOpen={proctoring.fullscreenPaused && !proctoring.state.isFullscreen}
        exitCount={proctoring.state.fullscreenExitCount}
        maxExits={3}
        onReturnToFullscreen={proctoring.enterFullscreen}
      />
      
      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Preparation Stage */}
          {stage === 'preparation' && (
            <motion.div
              key="preparation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <Button 
                variant="ghost" 
                className="mb-6"
                onClick={() => router.push('/')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                На главную
              </Button>

              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Подготовка к тестированию</h1>
                <p className="text-muted-foreground">
                  Пожалуйста, выполните все пункты перед началом
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {preparationChecklist.map((item, index) => (
                  <motion.label
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all",
                      preparationChecks[item.id]
                        ? "border-success bg-success/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      preparationChecks[item.id]
                        ? "border-success bg-success text-success-foreground"
                        : "border-muted-foreground"
                    )}>
                      {preparationChecks[item.id] && (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={preparationChecks[item.id] || false}
                        onChange={(e) => setPreparationChecks(prev => ({
                          ...prev,
                          [item.id]: e.target.checked
                        }))}
                      />
                      <p className="font-medium">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </motion.label>
                ))}
              </div>

              <Button
                size="lg"
                className="w-full"
                disabled={!allChecked}
                onClick={() => setStage('specialization')}
              >
                Начать тест
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Specialization Selection */}
          {stage === 'specialization' && (
            <motion.div
              key="specialization"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Выберите специализацию</h1>
                <p className="text-muted-foreground">
                  Пройдите тестирование по вашему направлению. Для прохождения необходимо ответить правильно на 4 из 5 вопросов.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Бухгалтер */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSpecialization('accountant')
                    handleStartTest()
                  }}
                  className={cn(
                    "p-6 rounded-2xl border-2 text-left transition-all",
                    specialization === 'accountant'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 mb-4">
                    <Calculator className="h-7 w-7 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Бухгалтер</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Проводки, НДС, ФСБУ, отчётность, балансовое уравнение
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      30 минут
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      5 вопросов
                    </span>
                  </div>
                </motion.button>

                {/* Account Manager */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSpecialization('account_manager')
                    handleStartTest()
                  }}
                  className={cn(
                    "p-6 rounded-2xl border-2 text-left transition-all",
                    specialization === 'account_manager'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-500/10 mb-4">
                    <Users className="h-7 w-7 text-violet-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Account Manager</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    LTV/CAC, unit-экономика, retention, ап-сейл, работа с возражениями
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      30 минут
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      5 вопросов
                    </span>
                  </div>
                </motion.button>

                {/* Маркетинг недвижимости */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSpecialization('marketing')
                    handleStartTest()
                  }}
                  className={cn(
                    "p-6 rounded-2xl border-2 text-left transition-all",
                    specialization === 'marketing'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 mb-4">
                    <Building2 className="h-7 w-7 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Маркетинг в недвижимости</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    ROI-анализ, лидогенерация, CRM, таргетинг
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      30 минут
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      5 вопросов
                    </span>
                  </div>
                </motion.button>

                {/* Бухгалтерия малого бизнеса */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setSpecialization('accounting')
                    handleStartTest()
                  }}
                  className={cn(
                    "p-6 rounded-2xl border-2 text-left transition-all",
                    specialization === 'accounting'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10 mb-4">
                    <Calculator className="h-7 w-7 text-green-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Бухгалтерия малого бизнеса</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Налоги, отчетность, 1С, оптимизация
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      30 минут
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4" />
                      5 вопросов
                    </span>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Testing Stage */}
          {stage === 'testing' && !proctoring.isTerminated && (
            <motion.div
              key="testing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <Shield className="h-4 w-4 proctoring-pulse" />
                    Режим прокторинга активен
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
                  timeRemaining <= 300 ? "bg-destructive/10 text-destructive" : "bg-muted"
                )}>
                  <Clock className="h-5 w-5" />
                  {formatTime(timeRemaining)}
                </div>
              </div>

              {/* Progress */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">
                    Вопрос {currentQuestion + 1} из {questions.length}
                  </span>
                  <span className="text-muted-foreground">
                    {questions[currentQuestion].category}
                  </span>
                </div>
                <Progress value={((currentQuestion + 1) / questions.length) * 100} />
              </div>

              {/* Question Card */}
              <div className="rounded-2xl border border-border bg-card p-8 no-select">
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn(
                    "px-2 py-1 rounded text-xs font-medium",
                    questions[currentQuestion].complexity === 'easy' && "bg-success/20 text-success",
                    questions[currentQuestion].complexity === 'medium' && "bg-warning/20 text-warning",
                    questions[currentQuestion].complexity === 'hard' && "bg-destructive/20 text-destructive"
                  )}>
                    {questions[currentQuestion].complexity === 'easy' && 'Легкий'}
                    {questions[currentQuestion].complexity === 'medium' && 'Средний'}
                    {questions[currentQuestion].complexity === 'hard' && 'Сложный'}
                  </span>
                </div>

                <h2 className="text-xl font-semibold mb-6">
                  {questions[currentQuestion].text}
                </h2>

                {questions[currentQuestion].type === 'multiple_choice' ? (
                  <div className="space-y-3">
                    {questions[currentQuestion].options?.map((option, index) => {
                      const isSelected = answers[questions[currentQuestion].id] === index
                      const isCorrect = questions[currentQuestion].correctAnswer === index
                      const showResult = showExplanation && isAnswerLocked
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswer(questions[currentQuestion].id, index)}
                          disabled={isAnswerLocked}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 text-left transition-all",
                            !showResult && isSelected && "border-primary bg-primary/5",
                            !showResult && !isSelected && "border-border hover:border-primary/50",
                            showResult && isCorrect && "border-success bg-success/10",
                            showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                            isAnswerLocked && "cursor-default"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium",
                              !showResult && isSelected && "border-primary bg-primary text-primary-foreground",
                              !showResult && !isSelected && "border-muted-foreground",
                              showResult && isCorrect && "border-success bg-success text-success-foreground",
                              showResult && isSelected && !isCorrect && "border-destructive bg-destructive text-destructive-foreground"
                            )}>
                              {showResult && isCorrect ? (
                                <CheckCircle2 className="h-4 w-4" />
                              ) : showResult && isSelected && !isCorrect ? (
                                <XCircle className="h-4 w-4" />
                              ) : (
                                String.fromCharCode(65 + index)
                              )}
                            </div>
                            <span>{option}</span>
                          </div>
                        </button>
                      )
                    })}
                    
                    {/* Explanation after answer */}
                    {showExplanation && questions[currentQuestion].explanation && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 rounded-xl bg-muted/50 border border-border"
                      >
                        <div className="flex items-start gap-3">
                          <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm mb-1">Пояснение:</p>
                            <p className="text-sm text-muted-foreground">
                              {questions[currentQuestion].explanation}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <Textarea
                    placeholder="Введите ваш ответ..."
                    className="min-h-[150px] resize-none"
                    value={answers[questions[currentQuestion].id] as string || ''}
                    onChange={(e) => handleAnswer(questions[currentQuestion].id, e.target.value)}
                  />
                )}

                <div className="mt-8 flex justify-end">
                  <Button
                    size="lg"
                    onClick={handleNextQuestion}
                    disabled={answers[questions[currentQuestion].id] === undefined}
                  >
                    {currentQuestion < questions.length - 1 ? 'Следующий вопрос' : 'Перейти к AI-интервью'}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* AI Interview Stage */}
          {stage === 'ai-interview' && !proctoring.isTerminated && aiQuestions.length > 0 && (
            <motion.div
              key="ai-interview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <Brain className="h-4 w-4" />
                    AI-интервью
                  </div>
                  {specConfig && (
                    <span className="text-sm text-muted-foreground">
                      {specConfig.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted font-mono text-lg font-bold">
                  <Clock className="h-5 w-5" />
                  {formatTime(timeRemaining)}
                </div>
              </div>

              <div className="mb-4">
                <Progress value={((currentInterviewQuestion + 1) / aiQuestions.length) * 100} />
                <p className="text-sm text-muted-foreground mt-2">
                  Вопрос {currentInterviewQuestion + 1} из {aiQuestions.length}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="p-6 border-b border-border bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium mb-1">AI-интервьюер</p>
                      <p className="text-foreground">
                        {aiQuestions[currentInterviewQuestion]?.text}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Введите ваш ответ..."
                    className="min-h-[120px] resize-none mb-4"
                    value={interviewAnswer}
                    onChange={handleTextareaChange}
                    onKeyDown={handleTextareaKeyDown}
                  />

                  {/* Typing metrics display */}
                  {proctoring.typingMetrics && proctoring.typingMetrics.currentWPM > 0 && (
                    <div className="mb-4 p-3 rounded-lg bg-muted/50 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Скорость печати:</span>
                        <span className={cn(
                          "font-medium",
                          proctoring.typingMetrics.currentWPM > 120 ? "text-destructive" : 
                          proctoring.typingMetrics.currentWPM > 80 ? "text-warning" : "text-foreground"
                        )}>
                          {proctoring.typingMetrics.currentWPM} сл/мин
                        </span>
                      </div>
                      {proctoring.typingMetrics.copyPasteDetected && (
                        <p className="mt-1 text-xs text-destructive">
                          Обнаружена вставка текста
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleInterviewSubmit}
                    disabled={!interviewAnswer.trim()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {currentInterviewQuestion < aiQuestions.length - 1 
                      ? 'Отправить и продолжить' 
                      : 'Завершить интервью'}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Analyzing Stage */}
          {stage === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto text-center py-20"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-6">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Анализируем ваши ответы</h2>
              <p className="text-muted-foreground mb-8">
                AI проверяет качество ответов и выявляет признаки автоматизации
              </p>
              
              <div className="space-y-4">
                <Progress value={analysisProgress} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Проверка на автоматизацию...</span>
                  <span>{analysisProgress}%</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Result Stage */}
          {stage === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto"
            >
              {proctoring.isTerminated ? (
                <div className="text-center py-12">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10 mx-auto mb-6">
                    <XCircle className="h-10 w-10 text-destructive" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Тест прерван</h2>
                  <p className="text-muted-foreground mb-6">
                    Превышен лимит нарушений ({proctoring.violationCount}/3).
                    Требуется пересдача под наблюдением.
                  </p>
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 mb-8">
                    <div className="flex items-center gap-2 text-destructive text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Зафиксированные нарушения:</span>
                    </div>
                    <ul className="mt-2 space-y-1 text-sm text-left">
                      {proctoring.violations.map((v, i) => (
                        <li key={i} className="text-muted-foreground">
                          {new Date(v.timestamp).toLocaleTimeString()}: {v.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button onClick={() => router.push('/')}>
                    Вернуться на главную
                  </Button>
                </div>
              ) : specialization && checkTestPassed(specialization, correctAnswersCount) ? (
                <>
                  <CertificateCard
                    candidateName="Иванов Иван Иванович"
                    specialization={specConfig?.name || ''}
                    score={finalScore}
                    isClean={proctoring.violationCount === 0 && proctoring.integrityScore >= 80}
                    date={new Date().toLocaleDateString('ru-RU')}
                    certificateId={`SKILL-${Date.now().toString(36).toUpperCase()}`}
                    onDownload={() => alert('Скачивание PDF...')}
                  />
                  <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/20 text-center">
                    <p className="text-success font-medium">
                      Поздравляем! Вы успешно прошли тест: {correctAnswersCount} из {questions.length} правильных ответов
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Integrity Score: {proctoring.integrityScore}%
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-warning/10 mx-auto mb-6">
                    <AlertTriangle className="h-10 w-10 text-warning" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Тест не пройден</h2>
                  <p className="text-muted-foreground mb-4">
                    Вы ответили правильно на {correctAnswersCount} из {questions.length} вопросов.
                  </p>
                  <p className="text-muted-foreground mb-6">
                    Для получения сертификата необходимо ответить правильно минимум на {specConfig?.passingScore || 4} вопросов.
                  </p>
                  <div className="p-4 rounded-lg bg-muted mb-8">
                    <p className="text-sm text-muted-foreground">
                      Вы можете пройти тест повторно после изучения материала.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push('/')}>
                      На главную
                    </Button>
                    <Button onClick={() => {
                      setStage('specialization')
                      setSpecialization(null)
                      setCurrentQuestion(0)
                      setAnswers({})
                      setCorrectAnswersCount(0)
                      setFinalScore(0)
                      setShowExplanation(false)
                      setIsAnswerLocked(false)
                      setTimeRemaining(30 * 60)
                      setCurrentInterviewQuestion(0)
                      setInterviewAnswers([])
                      setAnalysisProgress(0)
                    }}>
                      Попробовать снова
                    </Button>
                  </div>
                </div>
              )}

              {!proctoring.isTerminated && proctoring.violations.length > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 text-warning text-sm mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Зафиксированы подозрительные активности:</span>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {proctoring.violations.map((v, i) => (
                      <li key={i}>{v.description}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!proctoring.isTerminated && (
                <div className="mt-6 flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => router.push('/candidate/challenges')}
                  >
                    Перейти к челленджам
                  </Button>
                  <Button 
                    className="flex-1"
                    onClick={() => router.push('/candidate/cabinet')}
                  >
                    Личный кабинет
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
