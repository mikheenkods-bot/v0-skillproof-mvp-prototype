export interface CertificatePdfData {
  certificateId: string
  candidateName: string
  candidateEmail: string
  specialization: string
  score: number
  correctAnswers: number
  totalQuestions: number
  /** Какая это попытка (1 или 2) */
  attemptNumber: number
  /** Всего доступно попыток */
  maxAttempts: number
  /** Дата прохождения теста */
  date: Date
}

// Палитра под бренд «работа.ру».
const COLORS = {
  bg: '#ffffff',
  frame: '#4A7DFF',
  navy: '#0f2147',
  text: '#1e293b',
  muted: '#64748b',
  line: '#e2e8f0',
  panel: '#f8fafc',
}

/** Absolute URL to the public verification page for a certificate. */
export function getVerifyUrl(certificateId: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://www.skill-verify.ru'
  return `${origin}/verify/${certificateId}`
}

/** Generates a QR code data URL that encodes the verification link. */
export async function generateQrDataUrl(certificateId: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  const url = getVerifyUrl(certificateId)
  return QRCode.toDataURL(url, {
    width: 240,
    margin: 1,
    color: { dark: '#0f2147', light: '#ffffff' },
  })
}

/**
 * Рисует сертификат на canvas средствами браузера (нативный рендеринг шрифтов
 * полностью поддерживает кириллицу — встроенные шрифты jsPDF её НЕ
 * поддерживают) и возвращает JPEG dataURL. Альбомный A4 ~150 dpi: 1754 × 1240.
 */
async function drawCertificate(
  data: CertificatePdfData
): Promise<{ dataUrl: string; w: number; h: number }> {
  const W = 1754
  const H = 1240
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  const sans = 'Arial, "Helvetica Neue", Helvetica, sans-serif'

  ctx.fillStyle = COLORS.bg
  ctx.fillRect(0, 0, W, H)

  // Двойная рамка
  ctx.strokeStyle = COLORS.frame
  ctx.lineWidth = 6
  ctx.strokeRect(40, 40, W - 80, H - 80)
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  ctx.strokeRect(58, 58, W - 116, H - 116)

  const cx = W / 2

  // Шапка: бренд + продукт
  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.frame
  ctx.font = `bold 48px ${sans}`
  ctx.fillText('работа.ру', cx - 100, 150)
  ctx.fillStyle = COLORS.navy
  ctx.font = `600 38px ${sans}`
  ctx.fillText('· SkillProof', cx + 120, 150)

  // Заголовок
  ctx.fillStyle = COLORS.navy
  ctx.font = `bold 92px ${sans}`
  ctx.fillText('СЕРТИФИКАТ', cx, 280)

  ctx.fillStyle = COLORS.muted
  ctx.font = `28px ${sans}`
  ctx.fillText('подтверждает успешное прохождение тестирования навыков', cx, 338)

  // Имя кандидата
  ctx.fillStyle = COLORS.text
  ctx.font = `bold 70px ${sans}`
  wrapCenteredText(ctx, data.candidateName || 'Кандидат', cx, 450, W - 360, 78)

  ctx.strokeStyle = COLORS.frame
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(cx - 300, 500)
  ctx.lineTo(cx + 300, 500)
  ctx.stroke()

  // Специализация
  ctx.fillStyle = COLORS.muted
  ctx.font = `26px ${sans}`
  ctx.fillText('Направление тестирования', cx, 560)
  ctx.fillStyle = COLORS.navy
  ctx.font = `600 42px ${sans}`
  ctx.fillText(data.specialization, cx, 610)

  // Балл
  ctx.fillStyle = COLORS.frame
  ctx.font = `bold 80px ${sans}`
  ctx.fillText(`${data.score} / 100`, cx, 730)
  ctx.fillStyle = COLORS.muted
  ctx.font = `24px ${sans}`
  ctx.fillText(
    `Правильных ответов: ${data.correctAnswers} из ${data.totalQuestions}`,
    cx,
    770
  )

  // Панель с деталями
  const panelX = 160
  const panelY = 820
  const panelW = W - 320
  const panelH = 250
  ctx.fillStyle = COLORS.panel
  roundRect(ctx, panelX, panelY, panelW, panelH, 18)
  ctx.fill()
  ctx.strokeStyle = COLORS.line
  ctx.lineWidth = 2
  roundRect(ctx, panelX, panelY, panelW, panelH, 18)
  ctx.stroke()

  const dateStr = data.date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const details: Array<[string, string]> = [
    ['Дата тестирования', dateStr],
    ['Количество попыток', `${data.attemptNumber} из ${data.maxAttempts}`],
    ['Email участника', data.candidateEmail || '—'],
    ['Уникальный номер сертификата', data.certificateId],
  ]

  const colW = (panelW - 300) / 2 // оставляем место справа под QR
  ctx.textAlign = 'left'
  details.forEach(([label, value], i) => {
    const col = i % 2
    const rowIdx = Math.floor(i / 2)
    const x = panelX + 50 + col * colW
    const y = panelY + 75 + rowIdx * 110
    ctx.fillStyle = COLORS.muted
    ctx.font = `22px ${sans}`
    ctx.fillText(label, x, y)
    ctx.fillStyle = COLORS.navy
    ctx.font = `600 32px ${sans}`
    ctx.fillText(truncate(ctx, value, colW - 40), x, y + 44)
  })

  // QR-код проверки подлинности (справа в панели)
  try {
    const qr = await generateQrDataUrl(data.certificateId)
    const img = await loadImage(qr)
    const qrSize = 170
    const qrX = panelX + panelW - qrSize - 50
    const qrY = panelY + (panelH - qrSize) / 2
    ctx.drawImage(img, qrX, qrY, qrSize, qrSize)
  } catch {
    // QR опционален — сертификат остаётся валидным по номеру.
  }

  // Футер
  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.muted
  ctx.font = `22px ${sans}`
  ctx.fillText(
    `Проверка подлинности: www.skill-verify.ru/verify/${data.certificateId}`,
    cx,
    H - 95
  )

  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), w: W, h: H }
}

/**
 * Строит и скачивает PDF-сертификат. Работает полностью на клиенте (jsPDF),
 * без обращения к серверу. Размер итогового файла — один JPEG, обычно
 * 200–500 КБ, что заведомо меньше лимита в 5 МБ.
 */
export async function buildCertificatePdfBlob(data: CertificatePdfData): Promise<Blob> {
  const { dataUrl, w, h } = await drawCertificate(data)

  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()

  const ratio = Math.min(pageW / w, pageH / h)
  const imgW = w * ratio
  const imgH = h * ratio
  const offsetX = (pageW - imgW) / 2
  const offsetY = (pageH - imgH) / 2

  pdf.addImage(dataUrl, 'JPEG', offsetX, offsetY, imgW, imgH)
  return pdf.output('blob')
}

export async function downloadCertificatePdf(data: CertificatePdfData): Promise<void> {
  const blob = await buildCertificatePdfBlob(data)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SkillProof-сертификат-${data.certificateId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// ── helpers ──────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function wrapCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  const shown = lines.slice(0, 2)
  const startY = y - ((shown.length - 1) * lineHeight) / 2
  shown.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight))
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) {
    t = t.slice(0, -1)
  }
  return `${t}…`
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
