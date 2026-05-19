"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import confetti from 'canvas-confetti'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { RulesModal } from '@/components/proctoring/rules-modal'
import { ProctoringWidget } from '@/components/proctoring/proctoring-widget'
import { IdentityVerification } from '@/components/proctoring/identity-verification'
import { CertificateCard } from '@/components/certificate/certificate-card'
import { useProctoring } from '@/hooks/use-proctoring'
import { marketingQuestions, accountingQuestions, aiInterviewQuestions } from '@/lib/demo-data'
import { cn } from '@/lib/utils'
import {
  Shield,
  Building2,
  Calculator,
  Clock,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  MessageSquare,
  Send,
  Loader2,
  Brain,
  XCircle,
  ArrowLeft
} from 'lucide-react'

type Stage = 'preparation' | 'identity-verification' | 'specialization' | 'testing' | 'ai-interview' | 'analyzing' | 'result'
type Specialization = 'marketing' | 'accounting' | null

const preparationChecklist = [
  { id: 'programs', label: 'Закройте все сторонние программы', description: 'Мессенджеры, браузерные расширения AI' },
  { id: 'tabs', label: 'Закройте лишние вкладки браузера', description: 'Оставьте только эту вкладку' },
  { id: 'alone', label: 'Убедитесь, что вы одни в комнате', description: 'Рядом не должно быть других людей' },
  { id: 'camera', label: 'Подготовьте веб-камеру', description: 'Потребуется для верификации личности' },
  { id: 'id', label: 'Подготовьте документ, удостоверяющий личность', description: 'Может потребоваться для верификации' }
]

export default function SkillProofPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('preparation')
  const [specialization, setSpecialization] = useState<Specialization>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number | string>>({})
  const [showRulesModal, setShowRulesModal] = useState(false)
  const [preparationChecks, setPreparationChecks] = useState<Record<string, boolean>>({})
  const [timeRemaining, setTimeRemaining] = useState(30 * 60)
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const [currentInterviewQuestion, setCurrentInterviewQuestion] = useState(0)
  const [interviewAnswer, setInterviewAnswer] = useState('')
  const [interviewAnswers, setInterviewAnswers] = useState<string[]>([])
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [shake, setShake] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const questions = specialization === 'marketing' ? marketingQuestions : accountingQuestions

  const proctoring = useProctoring({
    maxViolations: 3,
    onTerminate: () => {
      setStage('result')
      setFinalScore(0)
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

  // Analysis effect
  useEffect(() => {
    if (stage !== 'analyzing') return

    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          // Calculate score
          let correct = 0
          questions.forEach((q) => {
            if (q.type === 'multiple_choice' && answers[q.id] === q.correctAnswer) {
              correct++
            } else if (q.type === 'open' && answers[q.id]) {
              correct += 0.8 // partial credit for open questions
            }
          })
          const score = Math.round((correct / questions.length) * 100)
          setFinalScore(score)
          
          setTimeout(() => {
            setStage('result')
            if (proctoring.violationCount === 0 && score >= 70) {
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
  }, [stage, answers, questions, proctoring.violationCount])

  // Shake effect on violation
  useEffect(() => {
    if (proctoring.violationCount > 0) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }, [proctoring.violationCount])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartTest = () => {
    setShowRulesModal(true)
  }

  const handleAcceptRules = () => {
    setShowRulesModal(false)
    proctoring.startProctoring()
    setStage('testing')
    setQuestionStartTime(Date.now())
  }

  const handleAnswer = (questionId: string, answer: number | string) => {
    const timeSpent = Date.now() - questionStartTime
    const question = questions[currentQuestion]
    
    if (question.type === 'multiple_choice') {
      proctoring.checkAnswerTiming(question.complexity, timeSpent)
    }
    
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setQuestionStartTime(Date.now())
    } else {
      setStage('ai-interview')
    }
  }

  const handleInterviewSubmit = () => {
    if (!interviewAnswer.trim()) return
    
    setInterviewAnswers(prev => [...prev, interviewAnswer])
    setInterviewAnswer('')
    
    if (currentInterviewQuestion < aiInterviewQuestions.length - 1) {
      setCurrentInterviewQuestion(prev => prev + 1)
    } else {
      proctoring.stopProctoring()
      setStage('analyzing')
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setInterviewAnswer(value)
    proctoring.handleTyping(value)
  }

  const allChecked = preparationChecklist.every(item => preparationChecks[item.id])

  return (
    <div className={cn("min-h-screen bg-background", shake && "shake")}>
      <Header />
      
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
                onClick={() => setStage('identity-verification')}
              >
                Пройти верификацию
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Identity Verification Stage */}
          {stage === 'identity-verification' && (
            <motion.div
              key="identity-verification"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Button 
                variant="ghost" 
                className="mb-6"
                onClick={() => setStage('preparation')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>
              
              <IdentityVerification
                onComplete={() => setStage('specialization')}
                onCancel={() => setStage('preparation')}
              />
            </motion.div>
          )}

          {/* Specialization Selection */}
          {stage === 'specialization' && (
            <motion.div
              key="specialization"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto"
            >
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold mb-2">Выберите специализацию</h1>
                <p className="text-muted-foreground">
                  Пройдите тестирование по вашему направлению
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-4">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Маркетинг в недвижимости</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    ROI-анализ, лидогенерация, CRM, таргетинг, работа с договорами
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
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/20 mb-4">
                    <Calculator className="h-7 w-7 text-secondary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Бухгалтерия малого бизнеса</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Налоги, отчетность, 1С, оптимизация, расчет зарплаты
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
                    {questions[currentQuestion].options?.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswer(questions[currentQuestion].id, index)}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 text-left transition-all",
                          answers[questions[currentQuestion].id] === index
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium",
                            answers[questions[currentQuestion].id] === index
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground"
                          )}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span>{option}</span>
                        </div>
                      </button>
                    ))}
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
          {stage === 'ai-interview' && !proctoring.isTerminated && (
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
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted font-mono text-lg font-bold">
                  <Clock className="h-5 w-5" />
                  {formatTime(timeRemaining)}
                </div>
              </div>

              <div className="mb-4">
                <Progress value={((currentInterviewQuestion + 1) / aiInterviewQuestions.length) * 100} />
                <p className="text-sm text-muted-foreground mt-2">
                  Вопрос {currentInterviewQuestion + 1} из {aiInterviewQuestions.length}
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
                        {aiInterviewQuestions[currentInterviewQuestion]}
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
                  />

                  {proctoring.typingSpeed > 0 && (
                    <p className={cn(
                      "text-xs mb-4",
                      proctoring.typingSpeed > 120 ? "text-warning" : "text-muted-foreground"
                    )}>
                      Скорость печати: {proctoring.typingSpeed} сл/мин
                      {proctoring.typingSpeed > 120 && " (подозрительно высокая)"}
                    </p>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleInterviewSubmit}
                    disabled={!interviewAnswer.trim()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {currentInterviewQuestion < aiInterviewQuestions.length - 1 
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
                    Превышен лимит нарушений ({proctoring.violationCount}/{proctoring.maxViolations}).
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
                          {v.timestamp.toLocaleTimeString()}: {v.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button onClick={() => router.push('/')}>
                    Вернуться на главную
                  </Button>
                </div>
              ) : (
                <CertificateCard
                  candidateName="Иванов Иван Иванович"
                  specialization={specialization === 'marketing' ? 'Маркетинг в недвижимости' : 'Бухгалтерия малого бизнеса'}
                  score={finalScore}
                  isClean={proctoring.violationCount === 0 && proctoring.suspiciousActivities.length === 0}
                  date={new Date().toLocaleDateString('ru-RU')}
                  certificateId={`SKILL-${Date.now().toString(36).toUpperCase()}`}
                  onDownload={() => alert('Скачивание PDF...')}
                />
              )}

              {!proctoring.isTerminated && proctoring.violationCount > 0 && (
                <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <div className="flex items-center gap-2 text-warning text-sm mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Зафиксированы подозрительные активности:</span>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {proctoring.violations.map((v, i) => (
                      <li key={i}>{v.description}</li>
                    ))}
                    {proctoring.suspiciousActivities.map((a, i) => (
                      <li key={`s-${i}`}>{a}</li>
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

      {/* Proctoring Widget */}
      {(stage === 'testing' || stage === 'ai-interview') && (
        <ProctoringWidget
          isActive={proctoring.isActive}
          violations={proctoring.violationCount}
          maxViolations={proctoring.maxViolations}
        />
      )}

      {/* Rules Modal */}
      <RulesModal
        isOpen={showRulesModal}
        onAccept={handleAcceptRules}
        onClose={() => {
          setShowRulesModal(false)
          setSpecialization(null)
        }}
      />
    </div>
  )
}
