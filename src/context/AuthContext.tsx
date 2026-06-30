// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  onAuthStateChanged, signInWithPopup, signOut,
  User as FirebaseUser, GoogleAuthProvider,
} from 'firebase/auth'
import { auth } from '../lib/firebase'

const DEMO_KEY = 'devpulse-demo-auth'
const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  isLoggedIn: boolean
  isAuthLoading: boolean
  loginWithGoogle: () => Promise<void>
  loginWithDemo: () => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [isDemoLoggedIn, setIsDemoLoggedIn] = useState(() =>
    localStorage.getItem(DEMO_KEY) === 'true',
  )
  const [isAuthLoading, setIsAuthLoading] = useState(hasFirebase)

  useEffect(() => {
    if (!hasFirebase || !auth) {
      setIsAuthLoading(false)
      return
    }
    return onAuthStateChanged(auth, user => {
      setFirebaseUser(user)
      setIsAuthLoading(false)
    })
  }, [])

  const loginWithGoogle = async () => {
    if (!hasFirebase) {
      loginWithDemo()
      return
    }
    if (auth) await signInWithPopup(auth, new GoogleAuthProvider())
  }

  const loginWithDemo = () => {
    localStorage.setItem(DEMO_KEY, 'true')
    setIsDemoLoggedIn(true)
  }

  const logout = async () => {
    localStorage.removeItem(DEMO_KEY)
    setIsDemoLoggedIn(false)
    if (hasFirebase && auth) await signOut(auth)
    setFirebaseUser(null)
  }

  const isLoggedIn = isDemoLoggedIn || firebaseUser !== null

  return (
    <AuthContext.Provider value={{ firebaseUser, isLoggedIn, isAuthLoading, loginWithGoogle, loginWithDemo, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
