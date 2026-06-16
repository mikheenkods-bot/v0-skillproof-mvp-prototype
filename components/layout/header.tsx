"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useApp } from '@/components/providers/app-provider'
import { Sun, Moon, User, Briefcase, Code } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Header() {
  const { theme, setTheme, userRole, setUserRole } = useApp()
  const pathname = usePathname()

  const isHome = pathname === '/'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-3">
          {/* Rabota.ru Logo - Blue color matching the actual website */}
          <span 
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#4A7DFF' }}
          >
            работа.ру
          </span>
          <div className="h-5 w-px bg-border" />
          <span className="text-sm font-medium text-muted-foreground">SkillVerify</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {!isHome && userRole === 'candidate' && (
            <>
              <Link 
                href="/candidate/skillproof" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname.includes('/skillproof') ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                SkillProof
              </Link>
              <Link 
                href="/candidate/challenges" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname.includes('/challenges') ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                ChallengeGate
              </Link>
            </>
          )}
          {!isHome && userRole === 'employer' && (
            <>
              <Link 
                href="/employer/dashboard" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname.includes('/dashboard') ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                Воронка кандидатов
              </Link>
              <Link 
                href="/employer/challenges" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === '/employer/challenges' ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                Создать челлендж
              </Link>
              <Link 
                href="/integration" 
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                  pathname === '/integration' ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Code className="h-3.5 w-3.5" />
                Интеграция
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {!isHome && (
            <div className="hidden sm:flex items-center gap-1 mr-2 px-3 py-1.5 rounded-full bg-muted text-sm">
              {userRole === 'candidate' ? (
                <>
                  <User className="h-4 w-4 text-primary" />
                  <span>Соискатель</span>
                </>
              ) : (
                <>
                  <Briefcase className="h-4 w-4 text-primary" />
                  <span>Работодатель</span>
                </>
              )}
            </div>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="h-9 w-9"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">Переключить тему</span>
          </Button>

          {!isHome && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setUserRole(null)
                window.location.href = '/'
              }}
            >
              Выйти
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
