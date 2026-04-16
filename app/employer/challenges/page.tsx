"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Target,
  Building2,
  Calculator,
  Clock,
  Shield,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'

export default function CreateChallengePage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    specialization: '',
    deadline: '48',
    proctoringLevel: 'strict',
    criteria: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto text-center py-20"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-success/10 mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Челлендж создан!</h2>
            <p className="text-muted-foreground mb-8">
              Ваше задание опубликовано и доступно кандидатам
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setSubmitted(false)}>
                Создать еще
              </Button>
              <Button onClick={() => router.push('/employer/dashboard')}>
                К списку кандидатов
              </Button>
            </div>
          </motion.div>
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
          onClick={() => router.push('/employer/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к дашборду
        </Button>

        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 mb-4">
              <Target className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Создать челлендж</h1>
            <p className="text-muted-foreground">
              Опубликуйте практическое задание для оценки кандидатов
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Название задания</Label>
                <Input
                  id="title"
                  placeholder="Например: Разработать маркетинговую стратегию для ЖК"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание задания</Label>
                <Textarea
                  id="description"
                  placeholder="Подробно опишите задачу, которую должен выполнить кандидат..."
                  className="min-h-[150px]"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Специализация</Label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, specialization: 'marketing' })}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      formData.specialization === 'marketing'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Building2 className="h-6 w-6 text-primary mb-2" />
                    <p className="font-medium">Маркетинг недвижимости</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, specialization: 'accounting' })}
                    className={cn(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      formData.specialization === 'accounting'
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Calculator className="h-6 w-6 text-secondary-foreground mb-2" />
                    <p className="font-medium">Бухгалтерия</p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="criteria">Критерии оценки</Label>
                <Textarea
                  id="criteria"
                  placeholder="Перечислите критерии, по которым будет оцениваться решение..."
                  className="min-h-[100px]"
                  value={formData.criteria}
                  onChange={(e) => setFormData({ ...formData, criteria: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="deadline">Дедлайн (часы)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="deadline"
                      type="number"
                      className="pl-10"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      min="1"
                      max="168"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Уровень прокторинга</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, proctoringLevel: 'basic' })}
                      className={cn(
                        "flex-1 p-3 rounded-lg border text-sm font-medium transition-all",
                        formData.proctoringLevel === 'basic'
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      Базовый
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, proctoringLevel: 'strict' })}
                      className={cn(
                        "flex-1 p-3 rounded-lg border text-sm font-medium transition-all",
                        formData.proctoringLevel === 'strict'
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      Строгий
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Защита от плагиата включена</p>
                  <p className="text-muted-foreground">
                    Все решения будут проверены на уникальность и признаки использования AI
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full">
              Опубликовать челлендж
            </Button>
          </form>
        </div>
      </main>
    </div>
  )
}
