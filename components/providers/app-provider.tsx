"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

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
  const [userRole, setUserRole] = useState<UserRole>(null)
  const [theme, setTheme] = useState<Theme>('light')

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
