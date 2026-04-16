"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, AlertTriangle, Ban, Eye, Brain } from 'lucide-react'

interface RulesModalProps {
  isOpen: boolean
  onAccept: () => void
  onClose: () => void
}

const rules = [
  {
    id: 'no-ai',
    icon: Brain,
    title: 'Запрет на использование ИИ',
    description: 'Использование ChatGPT, Claude и других AI-ассистентов запрещено'
  },
  {
    id: 'no-tabs',
    icon: Ban,
    title: 'Не переключать вкладки',
    description: 'Переключение на другие вкладки или приложения фиксируется как нарушение'
  },
  {
    id: 'no-help',
    icon: Eye,
    title: 'Самостоятельное выполнение',
    description: 'Помощь третьих лиц запрещена, все ответы должны быть вашими'
  }
]

export function RulesModal({ isOpen, onAccept, onClose }: RulesModalProps) {
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  const allAccepted = rules.every(rule => accepted[rule.id])

  const handleCheckboxChange = (id: string, checked: boolean) => {
    setAccepted(prev => ({ ...prev, [id]: checked }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-2xl overflow-hidden"
          >
            <div className="bg-primary/10 p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Правила честного прохождения</h2>
                  <p className="text-sm text-muted-foreground">
                    Пожалуйста, ознакомьтесь и подтвердите
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-warning">Важно!</p>
                  <p className="text-muted-foreground">
                    При 3 нарушениях тест автоматически завершается. 
                    Результат будет помечен как требующий пересдачи под наблюдением.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {rules.map((rule) => (
                  <label
                    key={rule.id}
                    className="flex items-start gap-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <Checkbox
                      checked={accepted[rule.id] || false}
                      onCheckedChange={(checked) => handleCheckboxChange(rule.id, checked as boolean)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <rule.icon className="h-4 w-4 text-primary" />
                        <span className="font-medium">{rule.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {rule.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-border bg-muted/30 flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Отмена
              </Button>
              <Button 
                onClick={onAccept} 
                disabled={!allAccepted}
                className="flex-1"
              >
                Начать тестирование
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
