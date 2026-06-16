"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SkillsRadar } from '@/components/charts/skills-radar'
import { ActivityChart } from '@/components/charts/activity-chart'
import { cn } from '@/lib/utils'
import {
  Search,
  Filter,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  Target,
  Clock,
  Star,
  Mail,
  Video,
  X,
  Shield,
  TrendingUp,
  FileText,
  ArrowLeft,
  UserX
} from 'lucide-react'

// Types for real candidate data
interface RealCandidate {
  id: string
  name: string
  email: string
  avatar: string
  specialization: string
  skillProofScore: number
  proctoringStatus: 'clean' | 'suspicious' | 'violations'
  challengeStatus: 'completed' | 'in_progress' | 'pending_review' | 'not_started'
  violations: number
  originality: number
  completedAt: string
  skills: Array<{ name: string; score: number }>
  proctoringLog: Array<{ time: string; event: string; type: string }>
}

// Get real candidates from localStorage
function getRealCandidates(): RealCandidate[] {
  if (typeof window === 'undefined') return []
  
  const candidates: RealCandidate[] = []
  
  // Get certificates (completed SkillProof tests)
  const certificates = JSON.parse(localStorage.getItem('skillverify_certificates') || '[]')
  const challenges = JSON.parse(localStorage.getItem('skillverify_challenges') || '[]')
  const proctoringHistory = JSON.parse(localStorage.getItem('skillverify_proctoring_history') || '[]')
  
  // Group by unique sessions/users from certificates
  certificates.forEach((cert: { id: string; specialization: string; score: number; isClean: boolean; date: string; skills: Array<{ name: string; score: number }>; violations: number }, index: number) => {
    const matchingProctoring = proctoringHistory.find((p: { id: string; date: string }) => p.date === cert.date)
    const matchingChallenge = challenges.find((c: { completedAt: string }) => c.completedAt === cert.date)
    
    candidates.push({
      id: cert.id || `candidate-${index}`,
      name: `Кандидат ${index + 1}`,
      email: `candidate${index + 1}@test.com`,
      avatar: String.fromCharCode(65 + (index % 26)), // A, B, C...
      specialization: cert.specialization || 'Общий тест',
      skillProofScore: cert.score || 0,
      proctoringStatus: cert.isClean ? 'clean' : cert.violations > 2 ? 'violations' : 'suspicious',
      challengeStatus: matchingChallenge ? 'completed' : 'not_started',
      violations: cert.violations || 0,
      originality: matchingChallenge?.originality || 0,
      completedAt: cert.date || '-',
      skills: cert.skills || [],
      proctoringLog: matchingProctoring ? [
        { time: '10:00', event: 'Начало теста', type: 'info' },
        { time: '10:15', event: cert.violations > 0 ? 'Выход из полноэкранного режима' : 'Тест идет нормально', type: cert.violations > 0 ? 'warning' : 'info' },
        { time: '10:30', event: 'Тест завершен', type: 'info' }
      ] : []
    })
  })
  
  // Also add candidates from challenges that don't match certificates
  challenges.forEach((challenge: { id: string; title: string; specialization: string; score: number; originality: number; completedAt: string }, index: number) => {
    const hasMatchingCert = certificates.some((c: { date: string }) => c.date === challenge.completedAt)
    if (!hasMatchingCert) {
      candidates.push({
        id: challenge.id || `challenge-candidate-${index}`,
        name: `Кандидат ${candidates.length + 1}`,
        email: `challenge${index + 1}@test.com`,
        avatar: String.fromCharCode(65 + ((candidates.length) % 26)),
        specialization: challenge.specialization || challenge.title || 'ChallengeGate',
        skillProofScore: 0, // No SkillProof score
        proctoringStatus: 'clean' as const, // No proctoring for challenges
        challengeStatus: 'completed' as const,
        violations: 0,
        originality: challenge.originality || 0,
        completedAt: challenge.completedAt || '-',
        skills: [],
        proctoringLog: []
      })
    }
  })
  
  return candidates
}

export default function EmployerDashboardPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'clean' | 'suspicious' | 'violations'>('all')
  const [selectedCandidate, setSelectedCandidate] = useState<RealCandidate | null>(null)
  const [candidates, setCandidates] = useState<RealCandidate[]>([])
  
  // Load real candidates on mount
  useEffect(() => {
    const realCandidates = getRealCandidates()
    setCandidates(realCandidates)
  }, [])

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.specialization.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || c.proctoringStatus === filterStatus
    return matchesSearch && matchesFilter
  })

  const getStatusBadge = (status: RealCandidate['proctoringStatus']) => {
    switch (status) {
      case 'clean':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/20 text-success text-xs font-medium">
            <CheckCircle2 className="h-3 w-3" />
            Чисто
          </span>
        )
      case 'suspicious':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warning/20 text-warning text-xs font-medium">
            <AlertTriangle className="h-3 w-3" />
            Проверить
          </span>
        )
      case 'violations':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
            <XCircle className="h-3 w-3" />
            Нарушения
          </span>
        )
    }
  }

  const getChallengeStatusBadge = (status: RealCandidate['challengeStatus']) => {
    switch (status) {
      case 'completed':
        return <span className="text-success text-sm">Выполнен</span>
      case 'in_progress':
        return <span className="text-warning text-sm">В процессе</span>
      case 'pending_review':
        return <span className="text-primary text-sm">На проверке</span>
      default:
        return <span className="text-muted-foreground text-sm">Не начат</span>
    }
  }

  // Generate activity data for chart
  const generateActivityData = (candidate: RealCandidate) => {
    return candidate.proctoringLog.map((log, index) => ({
      time: log.time.slice(0, 5),
      activity: Math.max(20, 100 - (index * 10) + Math.random() * 20),
      event: log.event,
      type: log.type as 'warning' | 'normal' | 'violation' | undefined
    }))
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => router.push('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          На главную
        </Button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Воронка кандидатов</h1>
            <p className="text-muted-foreground">
              Управление и оценка верифицированных специалистов
            </p>
          </div>
          <Button onClick={() => router.push('/employer/challenges')}>
            Создать челлендж
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{candidates.length}</p>
                <p className="text-sm text-muted-foreground">Всего кандидатов</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {candidates.filter(c => c.proctoringStatus === 'clean').length}
                </p>
                <p className="text-sm text-muted-foreground">Прошли чисто</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {candidates.filter(c => c.proctoringStatus === 'suspicious').length}
                </p>
                <p className="text-sm text-muted-foreground">Требуют проверки</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {candidates.filter(c => c.skillProofScore > 0).length > 0 
                    ? Math.round(candidates.filter(c => c.skillProofScore > 0).reduce((a, b) => a + b.skillProofScore, 0) / candidates.filter(c => c.skillProofScore > 0).length) + '%'
                    : '—'}
                </p>
                <p className="text-sm text-muted-foreground">Средний балл</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по имени или специализации..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('all')}
            >
              Все
            </Button>
            <Button
              variant={filterStatus === 'clean' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('clean')}
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Чисто
            </Button>
            <Button
              variant={filterStatus === 'suspicious' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('suspicious')}
            >
              <AlertTriangle className="mr-1 h-3 w-3" />
              Проверить
            </Button>
            <Button
              variant={filterStatus === 'violations' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('violations')}
            >
              <XCircle className="mr-1 h-3 w-3" />
              Нарушения
            </Button>
          </div>
        </div>

        {/* Candidates Table */}
        {candidates.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
              <UserX className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Нет кандидатов</h3>
            <p className="text-muted-foreground mb-6">
              Пока никто не прошел тестирование. Данные появятся после того, как кандидаты завершат SkillProof или ChallengeGate.
            </p>
            <Button onClick={() => router.push('/candidate/skillproof')}>
              Пройти тест (демо)
            </Button>
          </div>
        ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-4 font-medium text-muted-foreground">Кандидат</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Специализация</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">SkillProof</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Прокторинг</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Челлендж</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => (
                  <tr 
                    key={candidate.id} 
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => setSelectedCandidate(candidate)}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-medium text-primary">
                          {candidate.avatar}
                        </div>
                        <div>
                          <p className="font-medium">{candidate.name}</p>
                          <p className="text-sm text-muted-foreground">{candidate.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{candidate.specialization}</td>
                    <td className="p-4 text-center">
                      <span className={cn(
                        "font-bold",
                        candidate.skillProofScore >= 80 ? "text-success" :
                        candidate.skillProofScore >= 60 ? "text-warning" :
                        candidate.skillProofScore > 0 ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {candidate.skillProofScore > 0 ? `${candidate.skillProofScore}%` : '-'}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(candidate.proctoringStatus)}
                    </td>
                    <td className="p-4 text-center">
                      {getChallengeStatusBadge(candidate.challengeStatus)}
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm">
                        Подробнее
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Candidate Detail Modal */}
        <AnimatePresence>
          {selectedCandidate && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setSelectedCandidate(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-card border border-border shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-border bg-card">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                      {selectedCandidate.avatar}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedCandidate.name}</h2>
                      <p className="text-muted-foreground">{selectedCandidate.specialization}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedCandidate.proctoringStatus)}
                    <Button variant="ghost" size="icon" onClick={() => setSelectedCandidate(null)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground">SkillProof Score</p>
                      <p className="text-2xl font-bold text-primary">
                        {selectedCandidate.skillProofScore > 0 ? `${selectedCandidate.skillProofScore}%` : '-'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground">Нарушений</p>
                      <p className={cn(
                        "text-2xl font-bold",
                        selectedCandidate.violations === 0 ? "text-success" : 
                        selectedCandidate.violations < 3 ? "text-warning" : "text-destructive"
                      )}>
                        {selectedCandidate.violations}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground">Оригинальность</p>
                      <p className={cn(
                        "text-2xl font-bold",
                        selectedCandidate.originality >= 80 ? "text-success" : "text-warning"
                      )}>
                        {selectedCandidate.originality > 0 ? `${selectedCandidate.originality}%` : '-'}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground">Дата прохождения</p>
                      <p className="text-lg font-medium">
                        {selectedCandidate.completedAt || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Skills Radar & Activity */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="rounded-xl border border-border p-4">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Профиль компетенций
                      </h3>
                      {selectedCandidate.skillProofScore > 0 ? (
                        <SkillsRadar skills={selectedCandidate.skills} />
                      ) : (
                        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                          Тест не пройден
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-border p-4">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Активность прокторинга
                      </h3>
                      <ActivityChart 
                        data={generateActivityData(selectedCandidate)} 
                      />
                      <div className="mt-4 space-y-2">
                        {selectedCandidate.proctoringLog.slice(-5).map((log, i) => (
                          <div 
                            key={i}
                            className={cn(
                              "flex items-center justify-between text-sm p-2 rounded",
                              log.type === 'violation' && "bg-destructive/10",
                              log.type === 'warning' && "bg-warning/10"
                            )}
                          >
                            <span className={cn(
                              log.type === 'violation' && "text-destructive",
                              log.type === 'warning' && "text-warning"
                            )}>
                              {log.event}
                            </span>
                            <span className="text-muted-foreground">{log.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                    <Button>
                      <Mail className="mr-2 h-4 w-4" />
                      Пригласить на интервью
                    </Button>
                    {selectedCandidate.proctoringStatus === 'suspicious' && (
                      <Button variant="outline">
                        <Video className="mr-2 h-4 w-4" />
                        Запросить видео-подтверждение
                      </Button>
                    )}
                    <Button variant="outline">
                      <Star className="mr-2 h-4 w-4" />
                      Сохранить в избранное
                    </Button>
                    <Button variant="outline" className="text-destructive hover:text-destructive">
                      <XCircle className="mr-2 h-4 w-4" />
                      Отклонить
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
