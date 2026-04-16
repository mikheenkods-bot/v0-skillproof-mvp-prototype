"use client"

import { useState } from 'react'
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
  ArrowLeft
} from 'lucide-react'

const userProfile = {
  name: 'Иванов Иван Иванович',
  email: 'ivanov@email.com',
  phone: '+7 (999) 123-45-67',
  location: 'Москва',
  completeness: 85,
  avatar: 'И'
}

const certificates = [
  {
    id: 'SKILL-ABC123',
    specialization: 'Маркетинг в недвижимости',
    score: 87,
    isClean: true,
    date: '15.01.2024',
    skills: [
      { name: 'ROI-анализ', score: 90 },
      { name: 'Лидогенерация', score: 85 },
      { name: 'CRM-системы', score: 88 },
      { name: 'Таргетинг', score: 82 },
      { name: 'Договоры', score: 92 }
    ]
  }
]

const completedChallenges = [
  {
    id: '1',
    title: 'Разработать стратегию продаж для ЖК',
    specialization: 'Маркетинг недвижимости',
    score: 85,
    originality: 95,
    completedAt: '18.01.2024'
  }
]

const proctoringHistory = [
  {
    id: '1',
    date: '15.01.2024',
    type: 'SkillProof',
    specialization: 'Маркетинг в недвижимости',
    status: 'clean',
    violations: 0
  },
  {
    id: '2',
    date: '18.01.2024',
    type: 'ChallengeGate',
    specialization: 'Маркетинг недвижимости',
    status: 'clean',
    violations: 0
  }
]

const recommendedJobs = [
  {
    id: '1',
    title: 'Маркетолог недвижимости',
    company: 'ГК ПИК',
    location: 'Москва',
    salary: '150 000 - 200 000 руб.',
    match: 92
  },
  {
    id: '2',
    title: 'Специалист по продажам недвижимости',
    company: 'А101',
    location: 'Москва',
    salary: '120 000 - 180 000 руб.',
    match: 88
  },
  {
    id: '3',
    title: 'Digital-маркетолог',
    company: 'Самолет',
    location: 'Москва',
    salary: '140 000 - 190 000 руб.',
    match: 85
  }
]

export default function CandidateCabinetPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'certificates' | 'challenges' | 'proctoring' | 'jobs'>('certificates')

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
                          onDownload={() => alert('Скачивание PDF...')}
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
                            challenge.originality >= 80 ? "text-success" : "text-warning"
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
                {proctoringHistory.map((session) => (
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
                              <Shield className="h-3 w-3" />
                              {session.violations} нарушений
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Jobs Tab */}
            {activeTab === 'jobs' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
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
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
