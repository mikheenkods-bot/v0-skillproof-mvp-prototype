'use client'

import { useState } from 'react'
import { Star, Loader2, CheckCircle2, MessageSquarePlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { submitFeedback } from '@/app/actions/feedback'

interface FeedbackDialogProps {
  certificateId?: string | null
  candidateEmail?: string | null
  candidateName?: string | null
  specialization?: string | null
}

export function FeedbackDialog({
  certificateId,
  candidateEmail,
  candidateName,
  specialization,
}: FeedbackDialogProps) {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const handleSubmit = async () => {
    if (rating < 1) return
    setStatus('sending')
    const res = await submitFeedback({
      certificateId,
      candidateEmail,
      candidateName,
      specialization,
      rating,
      comment,
    })
    setStatus(res.success ? 'done' : 'error')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          Оставить отзыв о тестировании
        </Button>
      </DialogTrigger>
      <DialogContent>
        {status === 'done' ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="mb-1">Спасибо за отзыв!</DialogTitle>
            <DialogDescription>
              Ваша оценка поможет нам улучшить тестирование.
            </DialogDescription>
            <Button className="mt-6 w-full" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Обратная связь</DialogTitle>
              <DialogDescription>
                Поделитесь впечатлениями о пройденном тестировании — это анонимно
                для работодателя и видно только команде сервиса.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <Label>Ваша оценка</Label>
                <div className="flex items-center gap-1" role="radiogroup" aria-label="Оценка">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} из 5`}
                      onMouseEnter={() => setHover(n)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setRating(n)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={cn(
                          'h-8 w-8 transition-colors',
                          (hover || rating) >= n
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-muted-foreground/40'
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback-comment">Комментарий (необязательно)</Label>
                <Textarea
                  id="feedback-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Что понравилось, что можно улучшить?"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              {status === 'error' && (
                <p className="text-sm text-destructive">
                  Не удалось отправить отзыв. Попробуйте ещё раз.
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                onClick={handleSubmit}
                disabled={rating < 1 || status === 'sending'}
                className="w-full gap-2"
              >
                {status === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
                Отправить отзыв
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
