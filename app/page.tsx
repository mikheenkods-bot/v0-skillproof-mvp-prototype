"use client"

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { useApp } from '@/components/providers/app-provider'
import { 
  Shield, 
  Award, 
  Target, 
  Users, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Brain,
  FileCheck,
  Building2,
  Calculator,
  ArrowRight
} from 'lucide-react'

const stats = [
  { value: '-40%', label: 'Time-to-hire', icon: Clock },
  { value: '+65%', label: 'Точность мэтчинга', icon: Target },
  { value: '-80%', label: 'Фейковых кандидатов', icon: Shield },
  { value: '50K+', label: 'Верифицированных специалистов', icon: Users }
]

const features = [
  {
    icon: Brain,
    title: 'AI-детекция читинга',
    description: 'Многоуровневая защита от использования ChatGPT и других AI-инструментов'
  },
  {
    icon: Shield,
    title: 'Система прокторинга',
    description: 'Контроль переключения вкладок, копирования и подозрительного поведения'
  },
  {
    icon: FileCheck,
    title: 'Проверка оригинальности',
    description: 'Анализ уникальности решений и сравнение с базой ответов'
  },
  {
    icon: Award,
    title: 'Верифицированные сертификаты',
    description: 'Цифровые сертификаты с QR-кодом и пометкой честного прохождения'
  }
]

export default function HomePage() {
  const { setUserRole } = useApp()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Shield className="h-4 w-4" />
                Verified & Proctored by работа.ру
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl font-bold tracking-tight text-balance"
            >
              Верификация навыков{' '}
              <span className="text-primary">с защитой от ИИ</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty"
            >
              Платформа профессиональной оценки кандидатов с многоуровневой системой 
              прокторинга и AI-детекцией для гарантии честных результатов
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/candidate/skillproof">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto text-base px-8"
                  onClick={() => setUserRole('candidate')}
                >
                  <Users className="mr-2 h-5 w-5" />
                  Я соискатель
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/employer/dashboard">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="w-full sm:w-auto text-base px-8"
                  onClick={() => setUserRole('employer')}
                >
                  <Building2 className="mr-2 h-5 w-5" />
                  Я работодатель
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-border bg-muted/30">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-3">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Два модуля верификации</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Комплексная оценка кандидатов через тестирование знаний и практические задания
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* SkillProof Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-xl"
            >
              <div className="absolute top-0 right-0 m-4">
                <div className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  AI-проверка
                </div>
              </div>
              
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-6">
                <Award className="h-7 w-7 text-primary" />
              </div>
              
              <h3 className="text-2xl font-bold mb-3">SkillProof</h3>
              <p className="text-muted-foreground mb-6">
                AI-тестирование профессиональных знаний с выдачей верифицированного сертификата 
                и полной защитой от читинга
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>5 вопросов по специализации</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>AI-интервью с проверкой на человечность</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Цифровой сертификат с QR-кодом</span>
                </li>
              </ul>

              <div className="flex gap-4">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Недвижимость</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Бухгалтерия</span>
                </div>
              </div>
            </motion.div>

            {/* ChallengeGate Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="group relative rounded-2xl border border-border bg-card p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-xl"
            >
              <div className="absolute top-0 right-0 m-4">
                <div className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
                  Практические кейсы
                </div>
              </div>
              
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/20 mb-6">
                <Target className="h-7 w-7 text-secondary-foreground" />
              </div>
              
              <h3 className="text-2xl font-bold mb-3">ChallengeGate</h3>
              <p className="text-muted-foreground mb-6">
                Практические задания от реальных компаний с проверкой оригинальности 
                решений и защитой от плагиата
              </p>

              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Реальные бизнес-кейсы</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>48 часов на выполнение</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Проверка уникальности решения</span>
                </li>
              </ul>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>Средняя оценка выполнения: 75%</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">Технология защиты</h2>
            <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
              Многоуровневая система детекции для гарантии честных результатов
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
                className="p-6 rounded-xl bg-card border border-border"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Готовы начать верификацию?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Присоединяйтесь к платформе, где навыки подтверждаются честно
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/candidate/skillproof">
                <Button size="lg" onClick={() => setUserRole('candidate')}>
                  Пройти верификацию
                </Button>
              </Link>
              <Link href="/employer/dashboard">
                <Button size="lg" variant="outline" onClick={() => setUserRole('employer')}>
                  Найти кандидатов
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg 
                viewBox="0 0 120 28" 
                className="h-6 w-auto"
                aria-label="работа.ру"
              >
                <text 
                  x="0" 
                  y="22" 
                  className="fill-primary font-bold" 
                  style={{ fontSize: '24px', fontFamily: 'system-ui, sans-serif', fontWeight: 700 }}
                >
                  работа.ру
                </text>
              </svg>
              <span className="text-sm text-muted-foreground">SkillVerify</span>
            </div>
            <p className="text-sm text-muted-foreground">
              2024 работа.ру. Все права защищены. Группа компаний HeadHunter.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
