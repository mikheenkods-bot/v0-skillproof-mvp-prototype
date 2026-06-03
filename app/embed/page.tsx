"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  CheckCircle2, 
  ArrowRight,
  Award,
  Brain,
  Target,
  Loader2
} from 'lucide-react'

function EmbedLandingContent() {
  const searchParams = useSearchParams()
  const [config, setConfig] = useState({
    theme: 'light',
    module: 'all', // 'skillproof' | 'challengegate' | 'all'
    hideTitle: false,
    primaryColor: '',
    companyName: '',
  })

  useEffect(() => {
    // Read config from URL params
    const theme = searchParams.get('theme') || 'light'
    const module = searchParams.get('module') || 'all'
    const hideTitle = searchParams.get('hideTitle') === 'true'
    const primaryColor = searchParams.get('primaryColor') || ''
    const companyName = searchParams.get('companyName') || ''

    setConfig({ theme, module, hideTitle, primaryColor, companyName })

    // Apply custom primary color if provided
    if (primaryColor) {
      document.documentElement.style.setProperty('--primary', primaryColor)
    }

    // Notify parent window that embed is ready
    window.parent.postMessage({ type: 'skillverify:ready' }, '*')
  }, [searchParams])

  const notifyParent = (action: string, data?: Record<string, unknown>) => {
    window.parent.postMessage({ 
      type: `skillverify:${action}`, 
      data 
    }, '*')
  }

  return (
    <div className="p-4 md:p-6">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {!config.hideTitle && (
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Shield className="h-4 w-4" />
                Verified & Proctored
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">
                {config.companyName ? `${config.companyName} - ` : ''}Верификация навыков
              </h1>
              <p className="text-muted-foreground">
                Подтвердите свои компетенции с защитой от списывания
              </p>
            </div>
          )}

          <div className="grid gap-4">
            {(config.module === 'all' || config.module === 'skillproof') && (
              <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">SkillProof</CardTitle>
                      <CardDescription>Тестирование с AI-интервью</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">Прокторинг</Badge>
                    <Badge variant="secondary">AI-анализ</Badge>
                    <Badge variant="secondary">Сертификат</Badge>
                  </div>
                  <Button 
                    className="w-full group-hover:bg-primary/90"
                    onClick={() => {
                      notifyParent('navigate', { path: '/embed/skillproof' })
                      window.location.href = '/embed/skillproof' + window.location.search
                    }}
                  >
                    Пройти тест
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}

            {(config.module === 'all' || config.module === 'challengegate') && (
              <Card className="border-2 hover:border-primary/50 transition-colors cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">ChallengeGate</CardTitle>
                      <CardDescription>Практические задания</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="secondary">Реальные кейсы</Badge>
                    <Badge variant="secondary">AI-ментор</Badge>
                    <Badge variant="secondary">Оценка</Badge>
                  </div>
                  <Button 
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      notifyParent('navigate', { path: '/embed/challenges' })
                      window.location.href = '/embed/challenges' + window.location.search
                    }}
                  >
                    Выбрать челлендж
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Trust indicators */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Защита от списывания</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Award className="h-4 w-4 text-primary" />
                <span>Верифицированный сертификат</span>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function EmbedLandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <EmbedLandingContent />
    </Suspense>
  )
}
