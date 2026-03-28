// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth'
import { auth } from '../lib/firebase'

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  isAuthLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, user => {
      setFirebaseUser(user)
      setIsAuthLoading(false)
    })
  }, [])

  const login  = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password).then(() => {})

  const logout = () => signOut(auth)

  return (
    <AuthContext.Provider value={{ firebaseUser, isAuthLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
