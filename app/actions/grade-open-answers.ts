'use server'

import { generateText, Output } from 'ai'
import { z } from 'zod'

export type OpenAnswerInput = {
  question: string
  answer: string
  /** Optional reference / expected points to help the grader. */
  reference?: string
}

export type GradedAnswer = {
  question: string
  /** 0-100 quality score for this single answer. */
  score: number
  feedback: string
}

export type GradeOpenAnswersResult = {
  ok: boolean
  /** Average 0-100 across all graded answers. */
  averageScore: number
  answers: GradedAnswer[]
}

const gradeSchema = z.object({
  answers: z.array(
    z.object({
      index: z.number().describe('0-based index of the answer being graded'),
      score: z
        .number()
        .describe('Quality score from 0 to 100 for the meaningfulness and correctness of the answer'),
      feedback: z.string().describe('Одно короткое предложение с обоснованием оценки на русском языке'),
    })
  ),
})

/**
 * Grades free-text / interview answers by MEANING using an LLM.
 * Gibberish, off-topic, or empty answers score low even if they contain
 * relevant keywords. Runs on the server (AI Gateway, zero-config).
 *
 * Fails open: if the model/gateway is unavailable, returns ok:false and a
 * neutral score so the candidate is never blocked by an outage.
 */
export async function gradeOpenAnswers(
  inputs: OpenAnswerInput[]
): Promise<GradeOpenAnswersResult> {
  const valid = inputs.filter((i) => i.question?.trim())
  if (valid.length === 0) {
    return { ok: true, averageScore: 0, answers: [] }
  }

  // Empty answers are an automatic zero — no need to spend a model call.
  const prepared = valid.map((i) => ({
    ...i,
    answer: (i.answer ?? '').trim(),
  }))

  const prompt = [
    'Ты — строгий, но справедливый экзаменатор. Оцени КАЖДЫЙ развёрнутый ответ кандидата по СМЫСЛУ и содержательности, а не по наличию ключевых слов.',
    '',
    'Правила оценивания (0-100):',
    '- 0-20: пустой ответ, бессмысленный набор слов, не по теме, или "не знаю".',
    '- 21-50: ответ по теме, но поверхностный, с ошибками или очень общий.',
    '- 51-80: корректный, осмысленный ответ с пониманием сути.',
    '- 81-100: глубокий, точный, профессиональный ответ с примерами/нюансами.',
    'Бессвязный текст или случайные слова, даже если они относятся к профессии, должны получать низкий балл.',
    '',
    'Вот ответы для оценки:',
    ...prepared.map(
      (it, idx) =>
        `\n[${idx}] Вопрос: ${it.question}\n${
          it.reference ? `Ожидаемое содержание: ${it.reference}\n` : ''
        }Ответ кандидата: ${it.answer || '(пусто)'}`
    ),
  ].join('\n')

  try {
    const { experimental_output } = await generateText({
      model: 'openai/gpt-5.4-mini',
      prompt,
      experimental_output: Output.object({ schema: gradeSchema }),
    })

    const byIndex = new Map(experimental_output.answers.map((a) => [a.index, a]))
    const answers: GradedAnswer[] = prepared.map((it, idx) => {
      const graded = byIndex.get(idx)
      const score = graded ? Math.max(0, Math.min(100, Math.round(graded.score))) : 0
      return {
        question: it.question,
        score: it.answer ? score : 0,
        feedback: graded?.feedback ?? 'Ответ не предоставлен.',
      }
    })

    const averageScore = answers.length
      ? Math.round(answers.reduce((sum, a) => sum + a.score, 0) / answers.length)
      : 0

    return { ok: true, averageScore, answers }
  } catch (error) {
    console.log('[v0] gradeOpenAnswers failed:', error)
    // Fail open with a neutral score so a transient AI outage doesn't break the flow.
    const answers: GradedAnswer[] = prepared.map((it) => ({
      question: it.question,
      score: it.answer ? 50 : 0,
      feedback: 'Автоматическая оценка временно недоступна.',
    }))
    const averageScore = answers.length
      ? Math.round(answers.reduce((sum, a) => sum + a.score, 0) / answers.length)
      : 0
    return { ok: false, averageScore, answers }
  }
}
