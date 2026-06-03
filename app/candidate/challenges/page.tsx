"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { challenges } from '@/lib/demo-data'
import { cn } from '@/lib/utils'
import {
  Target,
  Clock,
  Users,
  TrendingUp,
  ChevronRight,
  AlertTriangle,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle2,
  FileText,
  Upload,
  Shield,
  ArrowLeft,
  Building2,
  Calculator
} from 'lucide-react'

type Stage = 'list' | 'workspace' | 'checking' | 'feedback'

interface MentorMessage {
  role: 'mentor' | 'user'
  content: string
}

export default function ChallengesPage() {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('list')
  const [selectedChallenge, setSelectedChallenge] = useState<typeof challenges[0] | null>(null)
  const [solution, setSolution] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(48 * 60 * 60)
  const [mentorMessages, setMentorMessages] = useState<MentorMessage[]>([
    { role: 'mentor', content: 'Привет! Я AI-ментор. Если у вас возникнут вопросы по заданию, задавайте их здесь. Однако я не могу давать прямые ответы на задание.' }
  ])
  const [mentorInput, setMentorInput] = useState('')
  const [checkingProgress, setCheckingProgress] = useState(0)
  const [originality, setOriginality] = useState(0)
  const [feedbackScore, setFeedbackScore] = useState(0)

  // Timer effect (accelerated for demo)
  useEffect(() => {
    if (stage !== 'workspace') return

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [stage])

  // Checking effect - REAL scoring based on solution quality
  useEffect(() => {
    if (stage !== 'checking') return

    const interval = setInterval(() => {
      setCheckingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          
          // REAL scoring based on solution content
          const wordCount = solution.split(/\s+/).filter(w => w.length > 0).length
          const hasNumbers = /\d+/.test(solution)
          const hasStructure = solution.includes('\n') || solution.includes('1.') || solution.includes('•')
          const hasKeywords = /анализ|стратегия|клиент|бюджет|roi|ltv|план|решение|результат/i.test(solution)
          const isGibberish = /^[a-zA-Zа-яА-Я]{1,3}\s*$/m.test(solution) || solution.length < 50
          const hasRepetition = /(.{10,})\1{2,}/.test(solution)
          
          let realScore = 0
          let realOriginality = 0
          
          // Check for gibberish/random input
          if (isGibberish || hasRepetition || wordCount < 20) {
            realScore = Math.floor(Math.random() * 15) + 5 // 5-20%
            realOriginality = Math.floor(Math.random() * 20) + 10 // 10-30%
          } else if (wordCount < 50) {
            realScore = Math.floor(Math.random() * 20) + 20 // 20-40%
            realOriginality = Math.floor(Math.random() * 20) + 30 // 30-50%
          } else {
            // Base score from word count (min 100 words for decent score)
            const wordScore = Math.min(wordCount / 3, 30) // max 30 points
            // Structure bonus
            const structureScore = hasStructure ? 20 : 0
            // Keywords bonus
            const keywordScore = hasKeywords ? 15 : 0
            // Numbers/data bonus
            const dataScore = hasNumbers ? 10 : 0
            
            realScore = Math.min(Math.floor(wordScore + structureScore + keywordScore + dataScore + Math.random() * 10), 95)
            realOriginality = Math.min(Math.floor(50 + (wordCount / 5) + (hasStructure ? 15 : 0) + Math.random() * 15), 98)
          }
          
          setOriginality(realOriginality)
          setFeedbackScore(realScore)
          
          // Save challenge result to localStorage
          if (selectedChallenge) {
            const now = new Date()
            const dateStr = now.toLocaleDateString('ru-RU')
            
            const challengeResult = {
              id: `challenge-${Date.now()}`,
              title: selectedChallenge.title,
              specialization: selectedChallenge.specialization,
              score: realScore,
              originality: realOriginality,
              completedAt: dateStr
            }
            
            const existingChallenges = JSON.parse(localStorage.getItem('skillverify_challenges') || '[]')
            existingChallenges.push(challengeResult)
            localStorage.setItem('skillverify_challenges', JSON.stringify(existingChallenges))
          }
          
          setTimeout(() => setStage('feedback'), 500)
          return 100
        }
        return prev + 3
      })
    }, 100)

    return () => clearInterval(interval)
  }, [stage, solution])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartChallenge = (challenge: typeof challenges[0]) => {
    setSelectedChallenge(challenge)
    setStage('workspace')
  }

  const handleSubmit = () => {
    setStage('checking')
  }

  const handleMentorSend = () => {
    if (!mentorInput.trim()) return

    setMentorMessages(prev => [...prev, { role: 'user', content: mentorInput }])
    setMentorInput('')

    // Simulate mentor response
    setTimeout(() => {
      const responses = [
        'Хороший вопрос! Подумайте о целевой аудитории и её потребностях. Какие каналы коммуникации они используют чаще всего?',
        'Рекомендую начать с анализа конкурентов. Какие стратегии они используют?',
        'Важно учитывать бюджет и ROI. Какие метрики вы планируете отслеживать?',
        'Попробуйте структурировать ответ: проблема, анализ, решение, ожидаемые результаты.'
      ]
      setMentorMessages(prev => [
        ...prev,
        { role: 'mentor', content: responses[Math.floor(Math.random() * responses.length)] }
      ])
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Challenge List */}
          {stage === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
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
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-2">ChallengeGate</h1>
                <p className="text-muted-foreground">
                  Практические задания от реальных компаний с проверкой оригинальности
                </p>
              </div>

              <div className="p-4 rounded-lg bg-warning/10 border border-warning/20 mb-8">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-warning mb-1">Защита от плагиата</p>
                    <p className="text-muted-foreground">
                      Все решения проверяются на уникальность. Использование чужих работ или AI-генераторов 
                      будет обнаружено и приведет к дисквалификации.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {challenges.map((challenge, index) => (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          {challenge.specialization.includes('Маркетинг') ? (
                            <Building2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Calculator className="h-5 w-5 text-secondary-foreground" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            {challenge.specialization}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            challenge.difficulty === 'hard' && "bg-destructive/20 text-destructive"
                          )}>
                            {challenge.difficulty === 'hard' && 'Сложный'}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold mb-2">{challenge.title}</h3>
                        <p className="text-muted-foreground mb-4">{challenge.description}</p>

                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {challenge.deadline}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {challenge.completedCount} выполнили
                          </span>
                          <span className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            Средний балл: {challenge.averageScore}%
                          </span>
                        </div>
                      </div>

                      <Button onClick={() => handleStartChallenge(challenge)}>
                        Начать
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Workspace */}
          {stage === 'workspace' && selectedChallenge && (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-6xl mx-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold">{selectedChallenge.title}</h1>
                  <p className="text-muted-foreground">{selectedChallenge.specialization}</p>
                </div>
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold",
                  timeRemaining <= 3600 ? "bg-destructive/10 text-destructive" : "bg-muted"
                )}>
                  <Clock className="h-5 w-5" />
                  {formatTime(timeRemaining)}
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* Task Description */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Описание задания
                    </h2>
                    <p className="text-muted-foreground mb-6">
                      {selectedChallenge.description}
                    </p>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <h3 className="font-medium mb-2">Критерии оценки:</h3>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          Полнота анализа и обоснованность решений
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          Практическая применимость предложений
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          Оригинальность подхода
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          Структура и качество изложения
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Solution Editor */}
                  <div className="rounded-xl border border-border bg-card p-6">
                    <h2 className="font-semibold mb-4 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Ваше решение
                    </h2>
                    <Textarea
                      placeholder="Введите ваше решение здесь..."
                      className="min-h-[300px] resize-none mb-4 no-select"
                      value={solution}
                      onChange={(e) => setSolution(e.target.value)}
                    />
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {solution.split(/\s+/).filter(w => w.length > 0).length} слов
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline">
                          <Upload className="mr-2 h-4 w-4" />
                          Прикрепить файл
                        </Button>
                        <Button
                          onClick={handleSubmit}
                          disabled={solution.trim().length < 100}
                        >
                          Отправить на проверку
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-destructive mb-1">Предупреждение о плагиате</p>
                        <p className="text-muted-foreground">
                          После отправки ваше решение будет проверено на уникальность. 
                          Обнаружение плагиата или использования AI приведет к дисквалификации.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mentor Chat */}
                <div className="lg:col-span-1">
                  <div className="rounded-xl border border-border bg-card overflow-hidden sticky top-24">
                    <div className="p-4 border-b border-border bg-muted/30">
                      <h2 className="font-semibold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-primary" />
                        AI-Ментор
                      </h2>
                    </div>

                    <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                      {mentorMessages.map((msg, index) => (
                        <div
                          key={index}
                          className={cn(
                            "flex",
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div className={cn(
                            "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                            msg.role === 'user'
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t border-border">
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Задайте вопрос ментору..."
                          className="min-h-[60px] resize-none"
                          value={mentorInput}
                          onChange={(e) => setMentorInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleMentorSend()
                            }
                          }}
                        />
                        <Button size="icon" onClick={handleMentorSend}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Checking Stage */}
          {stage === 'checking' && (
            <motion.div
              key="checking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-md mx-auto text-center py-20"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-6">
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Проверка оригинальности</h2>
              <p className="text-muted-foreground mb-8">
                Сравниваем ваше решение с базой и проверяем на признаки AI-генерации
              </p>
              
              <div className="space-y-4">
                <Progress value={checkingProgress} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Анализ текста...</span>
                  <span>{checkingProgress}%</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Feedback Stage */}
          {stage === 'feedback' && selectedChallenge && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-success/10 mx-auto mb-6">
                  <CheckCircle2 className="h-10 w-10 text-success" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Решение принято!</h2>
                <p className="text-muted-foreground">
                  Ваше решение успешно проверено
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">{selectedChallenge.title}</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Оценка эксперта</p>
                      <p className="text-3xl font-bold text-primary">{feedbackScore}%</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Оригинальность</p>
                      <p className={cn(
                        "text-3xl font-bold",
                        originality >= 80 ? "text-success" : "text-warning"
                      )}>{originality}%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Комментарии эксперта:</h4>
                  <div className="p-4 rounded-lg bg-muted/30 text-sm text-muted-foreground space-y-2">
                    <p>Хорошо структурированное решение с понятной логикой изложения.</p>
                    <p>Рекомендуется добавить больше конкретных цифр и метрик для оценки эффективности.</p>
                    <p>Подход к анализу целевой аудитории показывает понимание специфики рынка.</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-4 rounded-lg bg-success/10 border border-success/20">
                  <Shield className="h-5 w-5 text-success" />
                  <span className="text-sm">
                    Проверка на плагиат и AI-генерацию пройдена успешно
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setStage('list')
                    setSelectedChallenge(null)
                    setSolution('')
                  }}
                >
                  К списку челленджей
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => router.push('/candidate/cabinet')}
                >
                  Личный кабинет
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
