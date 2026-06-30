// src/components/layout/Sidebar.tsx
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Zap, LayoutDashboard, TrendingUp, User, AlertTriangle,
  Calculator, Map, Calendar, Plug, Building2,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useUnifiedData, IS_UNIFIED_LIVE } from '../../context/UnifiedDataContext'

const navItems = [
  { path: '/today',    icon: Zap,             label: "Today's Briefing",    shortcut: 'T' },
  { path: '/',         icon: LayoutDashboard, label: 'Executive Dashboard', shortcut: 'D' },
  { path: '/sprint',   icon: TrendingUp,      label: 'Sprint Prediction',   shortcut: 'S' },
  { path: '/briefing', icon: User,            label: 'Developer Briefing',  shortcut: 'B' },
  { path: '/burnout',  icon: AlertTriangle,   label: 'Burnout Risk',        shortcut: 'W' },
  { path: '/roadmap',  icon: Map,             label: 'Roadmap',             shortcut: 'R' },
  { path: '/annual',   icon: Calendar,        label: 'Annual View',         shortcut: 'A' },
  { path: '/roi',      icon: Calculator,      label: 'ROI Calculator',      shortcut: undefined },
]

const settingsItems = [
  { path: '/settings/integrations', icon: Plug,      label: 'Integrations' },
  { path: '/settings/company',      icon: Building2, label: 'Company' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const [awaitingSecond, setAwaitingSecond] = useState(false)
  const unified = useUnifiedData()

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (!awaitingSecond) {
        if (e.key === 'g' || e.key === 'G') {
          setAwaitingSecond(true)
          timer = setTimeout(() => setAwaitingSecond(false), 1500)
        }
        return
      }

      clearTimeout(timer)
      setAwaitingSecond(false)

      const key = e.key.toUpperCase()
      const match = navItems.find(n => n.shortcut === key)
      if (match) navigate(match.path)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      clearTimeout(timer)
    }
  }, [awaitingSecond, navigate])

  return (
    <aside className="hidden md:flex w-60 h-screen bg-card border-r border-border flex-col fixed left-0 top-0 z-40">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">DP</span>
          </div>
          <div>
            <p className="text-text-primary font-semibold text-sm">DevPulse AI</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {IS_UNIFIED_LIVE ? (
                unified.isLive ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Live
                  </span>
                ) : unified.isLoading ? (
                  <span className="text-[10px] text-text-secondary">Syncing…</span>
                ) : (
                  <span className="text-[10px] text-warning">Unified error</span>
                )
              ) : (
                <span className="text-[10px] text-text-secondary">Demo data</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ path, icon: Icon, label, shortcut }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-accent' : ''} />
                <span className="flex-1">{label}</span>
                {shortcut && (
                  <span
                    className={`text-[9px] font-mono font-semibold px-1 py-0.5 rounded border transition-all duration-150 ${
                      awaitingSecond
                        ? 'border-accent/60 bg-accent/15 text-accent'
                        : 'border-border bg-bg text-text-secondary opacity-50'
                    }`}
                  >
                    G {shortcut}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <nav className="px-3 pb-4 border-t border-border pt-4 space-y-1">
        <p className="px-3 pb-1 text-text-secondary text-xs font-semibold uppercase tracking-wider">Settings</p>
        {settingsItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-accent' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <p className="text-text-secondary text-xs">Sprint 24 · 2 days left</p>
        <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-warning rounded-full"
            initial={{ width: 0 }}
            animate={{ width: '86%' }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
          />
        </div>
      </div>
    </aside>
  )
}
