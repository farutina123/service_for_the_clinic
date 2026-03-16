import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface AuthUser {
  id: string
  name: string
  phone: string
  email: string | null
  role: 'user' | 'admin'
  discount: number   // float: 0.1 = 10%
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'clinic_token'
const USER_KEY  = 'clinic_user'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user,  setUser]  = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else        localStorage.removeItem(TOKEN_KEY)
  }, [token])

  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else      localStorage.removeItem(USER_KEY)
  }, [user])

  function login(newToken: string, newUser: AuthUser) {
    setToken(newToken)
    setUser(newUser)
  }

  function logout() {
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
