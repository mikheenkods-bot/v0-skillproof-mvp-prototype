import jsPDF from 'jspdf'
import QRCode from 'qrcode'

export interface CertificatePdfData {
  candidateName: string
  specialization: string
  score: number
  isClean: boolean
  date: string
  certificateId: string
}

/** Absolute URL to the public verification page for a certificate. */
export function getVerifyUrl(certificateId: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : ''
  return `${origin}/verify/${certificateId}`
}

/** Generates a QR code data URL that encodes the verification link. */
export async function generateQrDataUrl(certificateId: string): Promise<string> {
  const url = getVerifyUrl(certificateId)
  return QRCode.toDataURL(url, {
    width: 240,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
  })
}

/**
 * Builds and triggers download of a PDF certificate. Runs entirely
 * client-side (jsPDF) — no server round-trip, no external paid calls.
 */
export async function downloadCertificatePdf(data: CertificatePdfData): Promise<void> {
  const { candidateName, specialization, score, isClean, date, certificateId } = data

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  // Border
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(1.2)
  doc.rect(10, 10, pageW - 20, pageH - 20)
  doc.setLineWidth(0.3)
  doc.rect(14, 14, pageW - 28, pageH - 28)

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(26)
  doc.setTextColor(15, 23, 42)
  doc.text('Сертификат SkillProof', pageW / 2, 38, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(12)
  doc.setTextColor(100, 116, 139)
  doc.text('работа.ру · SkillVerify', pageW / 2, 47, { align: 'center' })

  // Body
  doc.setFontSize(13)
  doc.setTextColor(71, 85, 105)
  doc.text('Настоящим подтверждается, что', pageW / 2, 70, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(15, 23, 42)
  doc.text(candidateName || 'Кандидат', pageW / 2, 84, { align: 'center' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.setTextColor(71, 85, 105)
  doc.text('успешно прошёл(а) тестирование по направлению', pageW / 2, 96, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(16, 122, 87)
  doc.text(specialization, pageW / 2, 106, { align: 'center' })

  // Score + integrity
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.setTextColor(15, 23, 42)
  doc.text(`${score}%`, pageW / 2, 126, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(100, 116, 139)
  doc.text(
    isClean ? 'Честно пройдено (без нарушений)' : 'Пройдено · требует проверки',
    pageW / 2,
    134,
    { align: 'center' }
  )

  // QR code (bottom-left) linking to /verify/{id}
  try {
    const qr = await generateQrDataUrl(certificateId)
    doc.addImage(qr, 'PNG', 24, pageH - 58, 34, 34)
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139)
    doc.text('Проверка подлинности', 24, pageH - 20)
  } catch {
    // QR is optional; certificate is still valid via the printed ID.
  }

  // Meta (bottom-right)
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.text(`ID: ${certificateId}`, pageW - 24, pageH - 30, { align: 'right' })
  doc.text(`Дата выдачи: ${date}`, pageW - 24, pageH - 23, { align: 'right' })

  doc.save(`certificate-${certificateId}.pdf`)
}
