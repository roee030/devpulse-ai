// src/components/layout/AppShell.tsx
import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <TopBar />
      <main className="ml-60 pt-14 min-h-screen">
        <div className="p-6 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  )
}
