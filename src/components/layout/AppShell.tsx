// src/components/layout/AppShell.tsx
import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MobileHeader } from './MobileHeader'
import { MobileTabBar } from './MobileTabBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      {/* Desktop layout */}
      <div className="hidden md:block">
        <Sidebar />
        <TopBar />
      </div>

      {/* Mobile layout */}
      <MobileHeader />
      <MobileTabBar />

      {/* Main content */}
      {/* Desktop: offset for sidebar (ml-60) and topbar (pt-14) */}
      {/* Mobile: offset for mobile header (pt-14) and tab bar (pb-20) */}
      <main className="pt-14 min-h-screen md:ml-60">
        <div className="p-4 md:p-6 max-w-[1400px] pb-24 md:pb-6">
          {children}
        </div>
      </main>
    </div>
  )
}
