import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'SkillVerify - Embed',
  description: 'Модуль верификации навыков для встраивания',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F5F7FA' },
    { media: '(prefers-color-scheme: dark)', color: '#262838' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen">
      {children}
    </main>
  )
}
