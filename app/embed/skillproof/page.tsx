"use client"

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import confetti from 'canvas-confetti'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RulesModal } from '@/components/proctoring/rules-modal'
import { ProctoringWidget } from '@/components/proctoring/proctoring-widget'
import { IdentityVerification } from '@/components/proctoring/identity-verification'
import { CertificateCard } from '@/components/certificate/certificate-card'
import { useProctoring } from '@/hooks/use-proctoring'
import { 
  specializations, 
  getRandomQuestions,
  isAnswerCorrect,
  getAIQuestionsForSpecialization,
  checkTestPassed,
  type SpecializationType 
} from '@/lib/demo-data'
import { cn } from '@/lib/utils'
import { gradeOpenAnswers, type OpenAnswerInput } from '@/app/actions/grade-open-answers'
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
  Home,
  Info
} from 'lucide-react'

type Stage = 'preparation' | 'identity-verification' | 'specialization' | 'testing' | 'ai-interview' | 'analyzing' | 'result'

const preparationChecklist = [
  { id: 'programs', label: 'Закройте все сторонние программы', description: 'Мессенджеры, браузерные расширения AI' },
  { id: 'tabs', label: 'Закройте лишние вкладки браузера', description: 'Оставьте только эту вкладку' },
  { id: 'alone', label: 'Убедитесь, что вы одни в комнате', description: 'Рядом не должно быть других людей' },
  { id: 'camera', label: 'Подготовьте веб-камеру', description: 'Потребуется для верификации личности' },
  { id: 'id', label: 'Подготовьте документ, удостоверяющий личность', description: 'Может потребоваться для верификации' }
]

function SkillProofContent() {
  const searchParams = useSearchParams()
  const [stage, setStage] = useState<Stage>('preparation')
  const [specialization, setSpecialization] = useState<SpecializationType | null>(null)
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
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0)
  const [shake, setShake] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isAnswerLocked, setIsAnswerLocked] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Get questions for selected specialization
  const questions = useMemo(
    () => (specialization ? getRandomQuestions(specialization, 10) : []),
    [specialization]
  )
  const aiQuestions = specialization ? getAIQuestionsForSpecialization(specialization) : []
  const specConfig = specialization ? specializations[specialization] : null

  // Notify parent window of events
  const notifyParent = useCallback((action: string, data?: Record<string, unknown>) => {
    window.parent.postMessage({ 
      type: `skillverify:${action}`, 
      data 
    }, '*')
  }, [])

  const proctoring = useProctoring({
    maxViolations: 3,
    onTerminate: () => {
      setStage('result')
      setFinalScore(0)
      notifyParent('terminated', { reason: 'violations' })
    }
  })

  // Notify parent of stage changes
  useEffect(() => {
    notifyParent('stageChange', { stage })
  }, [stage, notifyParent])

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

  // Analysis effect - calculate real score (objective + AI-graded open/interview answers)
  useEffect(() => {
    if (stage !== 'analyzing') return

    let cancelled = false

    const finalize = async () => {
      const openTestQuestions = questions.filter((q) => q.type === 'open')
      const objectiveQuestions = questions.filter((q) => q.type !== 'open')

      const openTestInputs: OpenAnswerInput[] = openTestQuestions.map((q) => ({
        question: q.text,
        answer: String(answers[q.id] ?? ''),
        reference: q.sampleAnswer,
      }))
      const interviewInputs: OpenAnswerInput[] = aiQuestions.map((q, i) => ({
        question: q.text,
        answer: interviewAnswers[i] ?? '',
      }))

      const allOpenInputs = [...openTestInputs, ...interviewInputs]
      let openGrades: number[] = []
      if (allOpenInputs.length > 0) {
        const fallback = new Promise<{ answers: { score: number }[] }>((resolve) =>
          setTimeout(
            () => resolve({ answers: allOpenInputs.map((i) => ({ score: i.answer.trim() ? 50 : 0 })) }),
            15000
          )
        )
        const result = await Promise.race([gradeOpenAnswers(allOpenInputs), fallback])
        openGrades = result.answers.map((a) => a.score)
      }
      if (cancelled) return

      const openTestGrades = openGrades.slice(0, openTestInputs.length)
      const interviewGrades = openGrades.slice(openTestInputs.length)

      const objectiveItemScores = objectiveQuestions.map((q) =>
        isAnswerCorrect(q, answers[q.id]) ? 100 : 0
      )
      const objectiveCorrect = objectiveItemScores.filter((s) => s === 100).length
      const openCorrect = openTestGrades.filter((s) => s >= 60).length
      const correct = objectiveCorrect + openCorrect
      setCorrectAnswersCount(correct)

      const allItemScores = [...objectiveItemScores, ...openTestGrades, ...interviewGrades]
      const score = allItemScores.length
        ? Math.round(allItemScores.reduce((sum, s) => sum + s, 0) / allItemScores.length)
        : 0
      setFinalScore(score)

      const passed = specialization ? checkTestPassed(specialization, correct) : false

      setStage('result')
      if (passed) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
      }
      notifyParent('completed', { score, passed, correctAnswers: correct })
    }

    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          void finalize()
          return 100
        }
        return prev + 2
      })
    }, 100)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [stage, notifyParent, answers, questions, aiQuestions, interviewAnswers, specialization])

  const allChecked = preparationChecklist.every(item => preparationChecks[item.id])

  const handleAnswerSelect = (questionId: string, answer: number | string) => {
    if (isAnswerLocked) return // Prevent changing answer
    
    const timeTaken = (Date.now() - questionStartTime) / 1000
    if (timeTaken < 3 && typeof answer === 'number') {
      proctoring.checkAnswerTiming('easy', timeTaken * 1000)
    }
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
    // Lock answer and show explanation
    setIsAnswerLocked(true)
    setShowExplanation(true)
  }

  const handleNextQuestion = () => {
    setShowExplanation(false)
    setIsAnswerLocked(false)
    
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
    
    if (currentInterviewQuestion < aiQuestions.length - 1) {
      setCurrentInterviewQuestion(prev => prev + 1)
    } else {
      proctoring.stopProctoring()
      setStage('analyzing')
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header for Embed */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-semibold">SkillProof</span>
            {stage !== 'preparation' && stage !== 'result' && (
              <Badge variant="outline" className="ml-2">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(timeRemaining)}
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              notifyParent('navigate', { path: '/embed' })
              window.location.href = '/embed' + window.location.search
            }}
          >
            <Home className="h-4 w-4 mr-2" />
            Назад
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <AnimatePresence mode="wait">
          {/* Preparation Stage */}
          {stage === 'preparation' && (
            <motion.div
              key="preparation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Подготовка к тестированию
                  </CardTitle>
                  <CardDescription>
                    Пожалуйста, выполните все пункты перед началом теста
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {preparationChecklist.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                        preparationChecks[item.id] ? "border-primary/50 bg-primary/5" : "border-border"
                      )}
                    >
                      <Checkbox
                        id={item.id}
                        checked={preparationChecks[item.id] || false}
                        onCheckedChange={(checked) => {
                          setPreparationChecks(prev => ({
                            ...prev,
                            [item.id]: checked === true
                          }))
                        }}
                        className="mt-0.5"
                      />
                      <Label htmlFor={item.id} className="cursor-pointer flex-1">
                        <span className="font-medium">{item.label}</span>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </Label>
                      {preparationChecks[item.id] && (
                        <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  
                  <Button
                    size="lg"
                    className="w-full mt-4"
                    disabled={!allChecked}
                    onClick={() => setStage('identity-verification')}
                  >
                    Пройти верификацию
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
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
                className="mb-4"
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
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold">Выберите специализацию</h2>
                <p className="text-sm text-muted-foreground mt-1">Для прохождения необходимо 4 из 5 правильных ответов</p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {/* Бухгалтер */}
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    specialization === 'accountant' && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => setSpecialization('accountant')}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                        <Calculator className="h-6 w-6 text-emerald-600" />
                      </div>
                      <h3 className="font-semibold">Бухгалтер</h3>
                      <p className="text-sm text-muted-foreground mt-1">5 вопросов + AI-интервью</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Account Manager */}
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    specialization === 'account_manager' && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => setSpecialization('account_manager')}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                        <Users className="h-6 w-6 text-violet-600" />
                      </div>
                      <h3 className="font-semibold">Account Manager</h3>
                      <p className="text-sm text-muted-foreground mt-1">5 вопросов + AI-интервью</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Маркетинг */}
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    specialization === 'marketing' && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => setSpecialization('marketing')}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold">Маркетинг недвижимости</h3>
                      <p className="text-sm text-muted-foreground mt-1">5 вопросов + AI-интервью</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Бухгалтерия МБ */}
                <Card 
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    specialization === 'accounting' && "border-primary ring-2 ring-primary/20"
                  )}
                  onClick={() => setSpecialization('accounting')}
                >
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                        <Calculator className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold">Бухгалтерия МБ</h3>
                      <p className="text-sm text-muted-foreground mt-1">5 вопросов + AI-интервью</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Button
                size="lg"
                className="w-full"
                disabled={!specialization}
                onClick={() => {
                  setShowRulesModal(true)
                }}
              >
                Продолжить
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>

              <RulesModal
                isOpen={showRulesModal}
                onClose={() => setShowRulesModal(false)}
                onAccept={() => {
                  setShowRulesModal(false)
                  proctoring.startProctoring()
                  setStage('testing')
                  setQuestionStartTime(Date.now())
                  notifyParent('testStarted', { specialization })
                }}
              />
            </motion.div>
          )}

          {/* Testing Stage */}
          {stage === 'testing' && questions.length > 0 && (
            <motion.div
              key="testing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProctoringWidget 
                isActive={proctoring.isActive}
                violations={proctoring.violationCount}
                maxViolations={proctoring.maxViolations}
              />

              <Card className={cn(shake && "animate-shake")}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Вопрос {currentQuestion + 1} из {questions.length}
                    </CardTitle>
                    <Badge variant="outline">{questions[currentQuestion].category}</Badge>
                  </div>
                  <Progress value={((currentQuestion + 1) / questions.length) * 100} className="mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-lg font-medium">{questions[currentQuestion].text}</p>

                  {questions[currentQuestion].type === 'multiple_choice' ? (
                    <div className="space-y-2">
                      {questions[currentQuestion].options?.map((option, idx) => {
                        const isSelected = answers[questions[currentQuestion].id] === idx
                        const isCorrect = questions[currentQuestion].correctAnswer === idx
                        const showResult = showExplanation && isAnswerLocked
                        
                        return (
                          <button
                            key={idx}
                            onClick={() => handleAnswerSelect(questions[currentQuestion].id, idx)}
                            disabled={isAnswerLocked}
                            className={cn(
                              "w-full text-left p-3 rounded-lg border transition-all",
                              !showResult && isSelected && "border-primary bg-primary/5",
                              !showResult && !isSelected && "border-border hover:border-primary/50",
                              showResult && isCorrect && "border-success bg-success/10",
                              showResult && isSelected && !isCorrect && "border-destructive bg-destructive/10",
                              isAnswerLocked && "cursor-default"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {showResult && isCorrect && <CheckCircle2 className="h-4 w-4 text-success" />}
                              {showResult && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-destructive" />}
                              <span>{option}</span>
                            </div>
                          </button>
                        )
                      })}
                      
                      {/* Explanation */}
                      {showExplanation && questions[currentQuestion].explanation && (
                        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">Пояснение:</p>
                              <p className="text-sm text-muted-foreground">{questions[currentQuestion].explanation}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Textarea
                      ref={textareaRef}
                      placeholder="Введите ваш ответ..."
                      value={(answers[questions[currentQuestion].id] as string) || ''}
                      onChange={(e) => {
                        handleAnswerSelect(questions[currentQuestion].id, e.target.value)
                        proctoring.handleTyping(e.target.value)
                      }}
                      className="min-h-[120px]"
                    />
                  )}

                  <Button
                    className="w-full"
                    disabled={answers[questions[currentQuestion].id] === undefined}
                    onClick={handleNextQuestion}
                  >
                    {currentQuestion < questions.length - 1 ? 'Следующий вопрос' : 'Перейти к AI-интервью'}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* AI Interview Stage */}
          {stage === 'ai-interview' && aiQuestions.length > 0 && (
            <motion.div
              key="ai-interview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ProctoringWidget 
                isActive={proctoring.isActive}
                violations={proctoring.violationCount}
                maxViolations={proctoring.maxViolations}
              />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI-Интервью {specConfig && `- ${specConfig.name}`}
                  </CardTitle>
                  <CardDescription>
                    Вопрос {currentInterviewQuestion + 1} из {aiQuestions.length}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm">{aiQuestions[currentInterviewQuestion]?.text}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {interviewAnswers.map((answer, idx) => (
                      <div key={idx} className="bg-primary/5 rounded-lg p-3 text-sm">
                        {answer}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Введите ваш ответ..."
                      value={interviewAnswer}
                      onChange={(e) => {
                        setInterviewAnswer(e.target.value)
                        proctoring.handleTyping(e.target.value)
                      }}
                      className="flex-1"
                    />
                    <Button onClick={handleInterviewSubmit} disabled={!interviewAnswer.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Analyzing Stage */}
          {stage === 'analyzing' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <div className="relative">
                <div className="h-24 w-24 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <Brain className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <svg className="absolute inset-0 h-24 w-24 -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    strokeDasharray={276}
                    strokeDashoffset={276 - (276 * analysisProgress) / 100}
                    className="transition-all duration-100"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mt-6">Анализируем ваши ответы</h2>
              <p className="text-muted-foreground mt-2">AI проверяет оригинальность и качество</p>
              <div className="mt-4 text-2xl font-bold text-primary">{analysisProgress}%</div>
            </motion.div>
          )}

          {/* Result Stage */}
          {stage === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {proctoring.isTerminated ? (
                <Card className="border-destructive">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                        <XCircle className="h-8 w-8 text-destructive" />
                      </div>
                      <h2 className="text-xl font-semibold">Тестирование прервано</h2>
                      <p className="text-muted-foreground mt-2">
                        Превышено максимальное количество нарушений
                      </p>
                      <Button
                        className="mt-6"
                        onClick={() => {
                          notifyParent('retry')
                          window.location.reload()
                        }}
                      >
                        Попробовать снова
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : specialization && checkTestPassed(specialization, correctAnswersCount) ? (
                <>
                  <CertificateCard
                    candidateName="Кандидат"
                    specialization={specConfig?.name || ''}
                    score={finalScore}
                    isClean={proctoring.violationCount === 0}
                    date={new Date().toLocaleDateString('ru-RU')}
                    certificateId={`SV-${Date.now().toString(36).toUpperCase()}`}
                    onDownload={() => notifyParent('downloadCertificate')}
                  />
                  <div className="p-4 rounded-lg bg-success/10 border border-success/20 text-center">
                    <p className="text-success font-medium">
                      Поздравляем! {correctAnswersCount} из {questions.length} правильных ответов
                    </p>
                  </div>
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
                        <AlertTriangle className="h-8 w-8 text-warning" />
                      </div>
                      <h2 className="text-xl font-semibold">Тест не пройден</h2>
                      <p className="text-muted-foreground mt-2">
                        Ваш результат: {correctAnswersCount} из {questions.length} правильных ответов.
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Для получения сертификата необходимо минимум {specConfig?.passingScore || 4} правильных ответа.
                      </p>
                      <Button
                        className="mt-6"
                        onClick={() => {
                          notifyParent('retry')
                          window.location.reload()
                        }}
                      >
                        Попробовать снова
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function EmbedSkillProofPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SkillProofContent />
    </Suspense>
  )
}
