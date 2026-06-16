'use server'

import { Resend } from 'resend'

interface ResultEmailInput {
  certificateId: string
  candidateName: string
  candidateEmail: string
  specialization: string
  score: number
}

// Экранирование пользовательского ввода перед вставкой в HTML письма.
// Без этого имя вида `<img src=x onerror=...>` попадало бы в разметку как есть.
function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Sends the candidate a copy of their test result.
// Requires RESEND_API_KEY. Optionally uses RESULT_EMAIL_FROM as the sender.
export async function sendResultEmail(input: ResultEmailInput) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.log('[v0] RESEND_API_KEY not set — skipping email send')
    return { ok: false, reason: 'not_configured' as const }
  }

  if (!input.candidateEmail) {
    return { ok: false, reason: 'no_email' as const }
  }

  const from = process.env.RESULT_EMAIL_FROM || 'SkillProof <onboarding@resend.dev>'

  const resend = new Resend(apiKey)

  // Все динамические значения экранируем перед вставкой в HTML.
  const safeName = escapeHtml(input.candidateName || 'кандидат')
  const safeSpecialization = escapeHtml(input.specialization)
  const safeCertificateId = escapeHtml(input.certificateId)

  try {
    const { error } = await resend.emails.send({
      from,
      to: input.candidateEmail,
      subject: `SkillProof: результат тестирования — ${input.score}/100`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 560px; margin: 0 auto; color: #111;">
          <h2 style="margin-bottom: 4px;">SkillProof</h2>
          <p style="color: #555; margin-top: 0;">Подтверждение навыков для резюме</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
          <p>Здравствуйте, ${safeName}!</p>
          <p>Ваш результат по тестированию <strong>«${safeSpecialization}»</strong> зафиксирован.</p>
          <div style="background: #f5f7fa; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <div style="font-size: 40px; font-weight: 700; color: #2563eb;">${input.score}<span style="font-size: 20px; color: #888;">/100</span></div>
            <div style="color: #555; font-size: 14px;">Итоговый балл</div>
          </div>
          <p style="font-size: 14px; color: #555;">Идентификатор результата: <strong>${safeCertificateId}</strong></p>
          <p style="font-size: 14px; color: #555;">Результат сохранён и может быть передан работодателю при отборе кандидатов.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 16px 0;" />
          <p style="font-size: 12px; color: #999;">Это автоматическое сообщение, отвечать на него не нужно.</p>
        </div>
      `,
    })

    if (error) {
      // Surface the real reason (invalid key, unverified domain, etc.) in logs.
      console.log('[v0] Resend returned an error:', JSON.stringify(error))
      return { ok: false as const, reason: 'send_failed' as const, detail: error.message }
    }
    return { ok: true as const }
  } catch (error) {
    console.log('[v0] Failed to send result email:', error)
    return { ok: false as const, reason: 'send_failed' as const }
  }
}
