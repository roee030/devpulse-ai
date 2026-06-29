// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  onAuthStateChanged, signInWithPopup, signOut,
  User as FirebaseUser, GoogleAuthProvider,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

const DEMO_KEY = 'devpulse-demo-auth'
const isDemoMode = !import.meta.env.VITE_FIREBASE_API_KEY

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  isLoggedIn: boolean
  isAuthLoading: boolean
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isDemoLoggedIn, setIsDemoLoggedIn] = useState(() =>
    isDemoMode && localStorage.getItem(DEMO_KEY) === 'true',
  )
  const [isAuthLoading, setIsAuthLoading] = useState(!isDemoMode)

  useEffect(() => {
    if (isDemoMode || !auth) return
    return onAuthStateChanged(auth, user => {
      setFirebaseUser(user)
      setIsAuthLoading(false)
    })
  }, [])

  const loginWithGoogle = async () => {
    if (isDemoMode) {
      localStorage.setItem(DEMO_KEY, 'true')
      setIsDemoLoggedIn(true)
      return
    }
    if (auth) await signInWithPopup(auth, new GoogleAuthProvider())
  }

  const logout = async () => {
    if (isDemoMode) {
      localStorage.removeItem(DEMO_KEY)
      setIsDemoLoggedIn(false)
      return
    }
    if (auth) await signOut(auth)
  }

  const isLoggedIn = isDemoMode ? isDemoLoggedIn : firebaseUser !== null

  return (
    <AuthContext.Provider value={{ firebaseUser, isLoggedIn, isAuthLoading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
