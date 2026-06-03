"use client"

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { challenges } from '@/lib/demo-data'
import {
  Target,
  Clock,
  ArrowRight,
  MessageSquare,
  Send,
  CheckCircle2,
  Home,
  Loader2,
  Award,
  Brain
} from 'lucide-react'

type Stage = 'list' | 'workspace' | 'submitted' | 'result'

export default function EmbedChallengesPage() {
  const searchParams = useSearchParams()
  const [stage, setStage] = useState<Stage>('list')
  const [selectedChallenge, setSelectedChallenge] = useState<typeof challenges[0] | null>(null)
  const [solution, setSolution] = useState('')
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [mentorMessages, setMentorMessages] = useState<Array<{ role: 'mentor' | 'user', text: string }>>([])
  const [mentorInput, setMentorInput] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [finalScore, setFinalScore] = useState(0)

  const notifyParent = useCallback((action: string, data?: Record<string, unknown>) => {
    window.parent.postMessage({ 
      type: `skillverify:${action}`, 
      data 
    }, '*')
  }, [])

  // Timer
  useEffect(() => {
    if (stage !== 'workspace' || timeRemaining <= 0) return

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
  }, [stage, timeRemaining])

  // Analysis effect
  useEffect(() => {
    if (!isAnalyzing) return

    const interval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          const score = Math.floor(65 + Math.random() * 30)
          setFinalScore(score)
          setIsAnalyzing(false)
          setStage('result')
          notifyParent('challengeCompleted', { 
            challengeId: selectedChallenge?.id, 
            score 
          })
          return 100
        }
        return prev + 3
      })
    }, 80)

    return () => clearInterval(interval)
  }, [isAnalyzing, selectedChallenge, notifyParent])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleStartChallenge = (challenge: typeof challenges[0]) => {
    setSelectedChallenge(challenge)
    setTimeRemaining(challenge.duration * 60)
    setMentorMessages([{
      role: 'mentor',
      text: `Привет! Я ваш AI-ментор для этого задания. Могу помочь с вопросами по задаче "${challenge.title}". Не стесняйтесь спрашивать!`
    }])
    setStage('workspace')
    notifyParent('challengeStarted', { challengeId: challenge.id })
  }

  const handleMentorSend = () => {
    if (!mentorInput.trim()) return
    
    setMentorMessages(prev => [...prev, { role: 'user', text: mentorInput }])
    const userQuestion = mentorInput
    setMentorInput('')
    
    // Simulate AI response
    setTimeout(() => {
      setMentorMessages(prev => [...prev, {
        role: 'mentor',
        text: `Отличный вопрос! По поводу "${userQuestion.slice(0, 30)}..." - рекомендую сфокусироваться на ключевых метриках и обосновать каждое предложение данными. Помните о целевой аудитории и бюджетных ограничениях.`
      }])
    }, 1000)
  }

  const handleSubmit = () => {
    setStage('submitted')
    setIsAnalyzing(true)
    setAnalysisProgress(0)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      default: return ''
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Compact Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-primary" />
            <span className="font-semibold">ChallengeGate</span>
            {stage === 'workspace' && (
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

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <AnimatePresence mode="wait">
          {/* Challenge List */}
          {stage === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <h1 className="text-2xl font-bold">Практические задания</h1>
                <p className="text-muted-foreground mt-1">Выберите задание для демонстрации навыков</p>
              </div>

              {challenges.map((challenge) => (
                <Card key={challenge.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{challenge.title}</h3>
                          <Badge className={getDifficultyColor(challenge.difficulty)}>
                            {challenge.difficulty === 'easy' ? 'Легкий' : 
                             challenge.difficulty === 'medium' ? 'Средний' : 'Сложный'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {challenge.duration} мин
                          </span>
                          <Badge variant="secondary">{challenge.company}</Badge>
                        </div>
                      </div>
                      <Button onClick={() => handleStartChallenge(challenge)}>
                        Начать
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          )}

          {/* Workspace */}
          {stage === 'workspace' && selectedChallenge && (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid gap-4 lg:grid-cols-3"
            >
              {/* Main workspace */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle>{selectedChallenge.title}</CardTitle>
                    <CardDescription>{selectedChallenge.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-4 mb-4">
                      <h4 className="font-medium mb-2">Задание:</h4>
                      <p className="text-sm">
                        Разработайте детальное решение с учётом бизнес-контекста. 
                        Опишите ваш подход, обоснуйте выбор инструментов и методов.
                      </p>
                    </div>
                    <Textarea
                      placeholder="Введите ваше решение..."
                      value={solution}
                      onChange={(e) => setSolution(e.target.value)}
                      className="min-h-[300px]"
                    />
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        {solution.length} символов
                      </p>
                      <Button 
                        onClick={handleSubmit}
                        disabled={solution.length < 100}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Отправить решение
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Mentor */}
              <Card className="h-fit lg:sticky lg:top-20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" />
                    AI-Ментор
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] overflow-y-auto space-y-3 mb-3">
                    {mentorMessages.map((msg, idx) => (
                      <div 
                        key={idx}
                        className={`p-2 rounded-lg text-sm ${
                          msg.role === 'mentor' 
                            ? 'bg-muted' 
                            : 'bg-primary/10 ml-4'
                        }`}
                      >
                        {msg.text}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Задайте вопрос..."
                      value={mentorInput}
                      onChange={(e) => setMentorInput(e.target.value)}
                      className="min-h-[60px] text-sm"
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
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Submitted / Analyzing */}
          {stage === 'submitted' && (
            <motion.div
              key="submitted"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
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
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mt-6">Анализируем решение</h2>
              <p className="text-muted-foreground mt-2">Проверка оригинальности и качества</p>
              <div className="mt-4 text-2xl font-bold text-primary">{analysisProgress}%</div>
            </motion.div>
          )}

          {/* Result */}
          {stage === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Award className="h-10 w-10 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Результат: {finalScore}%</h2>
                    <p className="text-muted-foreground mt-2 max-w-md">
                      {finalScore >= 80 
                        ? 'Отлично! Ваше решение демонстрирует глубокое понимание задачи.'
                        : finalScore >= 60
                        ? 'Хорошая работа! Есть области для улучшения.'
                        : 'Рекомендуем пересмотреть подход к решению.'}
                    </p>
                    
                    <div className="w-full max-w-xs mt-6">
                      <Progress value={finalScore} className="h-3" />
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setStage('list')
                          setSolution('')
                          setSelectedChallenge(null)
                        }}
                      >
                        Другой челлендж
                      </Button>
                      <Button
                        onClick={() => {
                          notifyParent('navigate', { path: '/embed' })
                          window.location.href = '/embed' + window.location.search
                        }}
                      >
                        На главную
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
