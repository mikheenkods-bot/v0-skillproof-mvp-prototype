"use client"

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CertificateCard } from '@/components/certificate/certificate-card'
import { SkillsRadar } from '@/components/charts/skills-radar'
import { cn } from '@/lib/utils'
import {
  User,
  Award,
  Target,
  Shield,
  CheckCircle2,
  Clock,
  Briefcase,
  MapPin,
  Mail,
  Phone,
  Edit,
  Download,
  ChevronRight,
  Building2,
  TrendingUp,
  FileText,
  Calendar,
  ArrowLeft,
  AlertCircle
} from 'lucide-react'

// Types for stored data
interface StoredCertificate {
  id: string
  specialization: string
  score: number
  isClean: boolean
  date: string
  skills: { name: string; score: number }[]
  violations: number
}

interface StoredChallenge {
  id: string
  title: string
  specialization: string
  score: number
  originality: number
  completedAt: string
}

interface StoredProctoringSession {
  id: string
  date: string
  type: string
  specialization: string
  status: 'clean' | 'violations'
  violations: number
}

interface UserProfile {
  name: string
  email: string
  phone: string
  location: string
  completeness: number
  avatar: string
}

// Default profile - can be edited by user
const defaultProfile: UserProfile = {
  name: 'Новый пользователь',
  email: 'user@email.com',
  phone: '+7 (___) ___-__-__',
  location: 'Не указан',
  completeness: 20,
  avatar: 'Н'
}

export default function CandidateCabinetPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'certificates' | 'challenges' | 'proctoring' | 'jobs'>('certificates')
  const [userProfile, setUserProfile] = useState<UserProfile>(defaultProfile)
  const [certificates, setCertificates] = useState<StoredCertificate[]>([])
  const [completedChallenges, setCompletedChallenges] = useState<StoredChallenge[]>([])
  const [proctoringHistory, setProctoringHistory] = useState<StoredProctoringSession[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load data from localStorage on mount
  useEffect(() => {
    setIsLoading(true)
    
    try {
      // Load user profile
      const storedProfile = localStorage.getItem('skillverify_user_profile')
      if (storedProfile) {
        setUserProfile(JSON.parse(storedProfile))
      }

      // Load certificates (from completed SkillProof tests)
      const storedCertificates = localStorage.getItem('skillverify_certificates')
      if (storedCertificates) {
        setCertificates(JSON.parse(storedCertificates))
      }

      // Load completed challenges
      const storedChallenges = localStorage.getItem('skillverify_challenges')
      if (storedChallenges) {
        setCompletedChallenges(JSON.parse(storedChallenges))
      }

      // Load proctoring history
      const storedProctoring = localStorage.getItem('skillverify_proctoring_history')
      if (storedProctoring) {
        setProctoringHistory(JSON.parse(storedProctoring))
      }

      // Calculate profile completeness
      const hasName = storedProfile && JSON.parse(storedProfile).name !== defaultProfile.name
      const hasCerts = storedCertificates && JSON.parse(storedCertificates).length > 0
      const hasChallenges = storedChallenges && JSON.parse(storedChallenges).length > 0
      
      let completeness = 20 // base
      if (hasName) completeness += 20
      if (hasCerts) completeness += 30
      if (hasChallenges) completeness += 30
      
      setUserProfile(prev => ({ ...prev, completeness: Math.min(completeness, 100) }))
      
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Calculate recommended jobs based on skills
  const recommendedJobs = certificates.length > 0 ? [
    {
      id: '1',
      title: certificates[0].specialization.includes('Бухгалтер') ? 'Бухгалтер' : 
             certificates[0].specialization.includes('Account') ? 'Account Manager' : 'Маркетолог',
      company: 'Крупная компания',
      location: 'Москва',
      salary: '100 000 - 150 000 руб.',
      match: Math.min(certificates[0].score + 5, 99)
    }
  ] : []

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка данных...</p>
          </div>
        </main>
      </div>
    )
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

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Profile */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Profile Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-6"
              >
                <div className="text-center mb-6">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary mx-auto mb-4">
                    {userProfile.avatar}
                  </div>
                  <h2 className="text-xl font-bold">{userProfile.name}</h2>
                  <p className="text-sm text-muted-foreground">Соискатель</p>
                </div>

                <div className="space-y-3 text-sm mb-6">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{userProfile.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{userProfile.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{userProfile.location}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Заполненность профиля</span>
                    <span className="font-medium">{userProfile.completeness}%</span>
                  </div>
                  <Progress value={userProfile.completeness} />
                </div>

                <Button variant="outline" className="w-full">
                  <Edit className="mr-2 h-4 w-4" />
                  Редактировать
                </Button>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-border bg-card p-4 space-y-2"
              >
                <Link href="/candidate/skillproof">
                  <Button variant="ghost" className="w-full justify-start">
                    <Award className="mr-2 h-4 w-4 text-primary" />
                    Пройти SkillProof
                  </Button>
                </Link>
                <Link href="/candidate/challenges">
                  <Button variant="ghost" className="w-full justify-start">
                    <Target className="mr-2 h-4 w-4 text-primary" />
                    Выполнить челлендж
                  </Button>
                </Link>
              </motion.div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={activeTab === 'certificates' ? 'default' : 'outline'}
                onClick={() => setActiveTab('certificates')}
              >
                <Award className="mr-2 h-4 w-4" />
                Сертификаты
              </Button>
              <Button
                variant={activeTab === 'challenges' ? 'default' : 'outline'}
                onClick={() => setActiveTab('challenges')}
              >
                <Target className="mr-2 h-4 w-4" />
                Челленджи
              </Button>
              <Button
                variant={activeTab === 'proctoring' ? 'default' : 'outline'}
                onClick={() => setActiveTab('proctoring')}
              >
                <Shield className="mr-2 h-4 w-4" />
                История прокторинга
              </Button>
              <Button
                variant={activeTab === 'jobs' ? 'default' : 'outline'}
                onClick={() => setActiveTab('jobs')}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Вакансии
              </Button>
            </div>

            {/* Certificates Tab */}
            {activeTab === 'certificates' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                {certificates.length > 0 ? (
                  <>
                    {certificates.map((cert) => (
                      <div key={cert.id} className="grid md:grid-cols-2 gap-6">
                        <CertificateCard
                          candidateName={userProfile.name}
                          specialization={cert.specialization}
                          score={cert.score}
                          isClean={cert.isClean}
                          date={cert.date}
                          certificateId={cert.id}
                        />
                        <div className="rounded-2xl border border-border bg-card p-6">
                          <h3 className="font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" />
                            Профиль компетенций
                          </h3>
                          <SkillsRadar skills={cert.skills} />
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-12 rounded-2xl border border-dashed border-border">
                    <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Нет сертификатов</h3>
                    <p className="text-muted-foreground mb-4">
                      Пройдите тестирование SkillProof, чтобы получить верифицированный сертификат
                    </p>
                    <Link href="/candidate/skillproof">
                      <Button>Пройти тестирование</Button>
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            {/* Challenges Tab */}
            {activeTab === 'challenges' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {completedChallenges.length > 0 ? (
                  completedChallenges.map((challenge) => (
                    <div
                      key={challenge.id}
                      className="rounded-xl border border-border bg-card p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            <span className="text-sm text-muted-foreground">
                              {challenge.specialization}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold mb-2">{challenge.title}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {challenge.completedAt}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{challenge.score}%</div>
                          <div className="text-sm text-muted-foreground">Оценка</div>
                          <div className={cn(
                            "mt-2 text-sm",
                            challenge.originality >= 80 ? "text-success" : challenge.originality >= 50 ? "text-warning" : "text-destructive"
                          )}>
                            Оригинальность: {challenge.originality}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 rounded-2xl border border-dashed border-border">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Нет выполненных челленджей</h3>
                    <p className="text-muted-foreground mb-4">
                      Выполните практическое задание, чтобы показать свои навыки
                    </p>
                    <Link href="/candidate/challenges">
                      <Button>Выбрать челлендж</Button>
                    </Link>
                  </div>
                )}
              </motion.div>
            )}

            {/* Proctoring History Tab */}
            {activeTab === 'proctoring' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {proctoringHistory.length > 0 ? (
                  proctoringHistory.map((session) => (
                    <div
                      key={session.id}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-lg",
                            session.status === 'clean' ? "bg-success/10" : "bg-warning/10"
                          )}>
                            <Shield className={cn(
                              "h-5 w-5",
                              session.status === 'clean' ? "text-success" : "text-warning"
                            )} />
                          </div>
                          <div>
                            <p className="font-medium">{session.type}: {session.specialization}</p>
                            <p className="text-sm text-muted-foreground">{session.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            session.status === 'clean' 
                              ? "bg-success/20 text-success" 
                              : "bg-warning/20 text-warning"
                          )}>
                            {session.status === 'clean' ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                Чисто
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                {session.violations} нарушений
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 rounded-2xl border border-dashed border-border">
                    <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Нет истории прокторинга</h3>
                    <p className="text-muted-foreground mb-4">
                      Пройдите тестирование, чтобы история появилась
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {certificates.length > 0 ? (
                  <>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mb-6">
                      <p className="text-sm">
                        <span className="font-medium">Рекомендации подобраны</span> на основе ваших 
                        верифицированных навыков и пройденных тестов
                      </p>
                    </div>

                    {recommendedJobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-xl border border-border bg-card p-6 hover:border-primary/50 transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold mb-1">{job.title}</h3>
                            <p className="text-muted-foreground mb-3">{job.company}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </span>
                              <span className="font-medium text-foreground">{job.salary}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/20 text-success text-sm font-medium">
                              <TrendingUp className="h-4 w-4" />
                              {job.match}% совпадение
                            </div>
                            <Button variant="ghost" size="sm" className="mt-2">
                              Подробнее
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center py-12 rounded-2xl border border-dashed border-border">
                    <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Нет рекомендаций</h3>
                    <p className="text-muted-foreground mb-4">
                      Пройдите тестирование SkillProof, чтобы получить персонализированные рекомендации вакансий
                    </p>
                    <Link href="/candidate/skillproof">
                      <Button>Пройти тестирование</Button>
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
