// src/context/CompanyContext.tsx
// Persists company name to localStorage so it's available app-wide without Firebase.
import { createContext, useContext, useState, type ReactNode } from 'react'

const LS_KEY = 'devpulse-company-name'

interface CompanyCtx {
  companyName: string
  setCompanyName: (name: string) => void
}

const Ctx = createContext<CompanyCtx>({ companyName: '', setCompanyName: () => {} })

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [companyName, setCompanyNameState] = useState<string>(() =>
    localStorage.getItem(LS_KEY) ?? ''
  )

  function setCompanyName(name: string) {
    setCompanyNameState(name)
    localStorage.setItem(LS_KEY, name)
  }

  return <Ctx.Provider value={{ companyName, setCompanyName }}>{children}</Ctx.Provider>
}

export function useCompanyName() {
  return useContext(Ctx)
}
