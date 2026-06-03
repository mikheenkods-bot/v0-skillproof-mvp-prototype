"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

type UserRole = 'candidate' | 'employer' | null
type Theme = 'light' | 'dark'

interface AppContextType {
  userRole: UserRole
  setUserRole: (role: UserRole) => void
  theme: Theme
  setTheme: (theme: Theme) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRoleState] = useState<UserRole>(null)
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // Load userRole from sessionStorage on mount
  useEffect(() => {
    setMounted(true)
    const savedRole = sessionStorage.getItem('skillverify-role') as UserRole
    if (savedRole) {
      setUserRoleState(savedRole)
    }
  }, [])

  // Custom setter that persists to sessionStorage
  const setUserRole = (role: UserRole) => {
    setUserRoleState(role)
    if (role) {
      sessionStorage.setItem('skillverify-role', role)
    } else {
      sessionStorage.removeItem('skillverify-role')
    }
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <AppContext.Provider value={{ userRole: null, setUserRole, theme, setTheme }}>
        <div className={theme === 'dark' ? 'dark' : ''}>
          {children}
        </div>
      </AppContext.Provider>
    )
  }

  return (
    <AppContext.Provider value={{ userRole, setUserRole, theme, setTheme }}>
      <div className={theme === 'dark' ? 'dark' : ''}>
        {children}
      </div>
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}
