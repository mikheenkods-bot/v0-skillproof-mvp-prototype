import '@/app/globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { AppProvider } from '@/components/providers/app-provider'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

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
    <html lang="ru" className="bg-background">
      <body className={`${inter.className} antialiased`}>
        <AppProvider>
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster position="top-center" richColors />
        </AppProvider>
      </body>
    </html>
  )
}
