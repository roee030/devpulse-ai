// src/components/layout/Sidebar.tsx
import { useEffect, useState, useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Zap, LayoutDashboard, TrendingUp, User, AlertTriangle,
  Calculator, Map, Calendar, Plug, Building2, Cpu, LayoutGrid, X, Keyboard,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  { path: '/tasks',      icon: LayoutGrid,      label: 'Task Intelligence',   shortcut: 'I' },
  { path: '/ai-effort', icon: Cpu,            label: 'AI Effort',           shortcut: undefined },
]

const settingsItems = [
  { path: '/settings/integrations', icon: Plug,      label: 'Integrations' },
  { path: '/settings/company',      icon: Building2, label: 'Company' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const [awaitingSecond, setAwaitingSecond] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const unified = useUnifiedData()

  const sprintLabel = useMemo(() => {
    const match = unified.sprint.name.match(/Sprint\s+\d+/i)
    return match ? match[0] : unified.sprint.name.split(/[–—-]/)[0].trim()
  }, [unified.sprint.name])

  const daysLeft = useMemo(() => {
    const end = new Date(unified.sprint.endDate)
    const diff = Math.ceil((end.getTime() - Date.now()) / 86_400_000)
    return Math.max(0, diff)
  }, [unified.sprint.endDate])

  const progressPct = useMemo(() => {
    if (!unified.sprint.totalPoints) return 0
    return Math.round(unified.sprint.completedPoints / unified.sprint.totalPoints * 100)
  }, [unified.sprint.completedPoints, unified.sprint.totalPoints])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>

    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if (e.key === 'Escape') {
        setHelpOpen(false)
        return
      }

      if (e.key === '?') {
        setHelpOpen(v => !v)
        return
      }

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
      if (match) {
        navigate(match.path)
        setHelpOpen(false)
      }
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
        <p className="text-text-secondary text-xs">
          {sprintLabel} · {daysLeft === 0 ? 'Last day' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`}
        </p>
        <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-warning rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
          />
        </div>
        <button
          onClick={() => setHelpOpen(true)}
          className="mt-3 flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-[11px]"
        >
          <Keyboard size={11} />
          <span>Keyboard shortcuts</span>
          <span className="ml-auto font-mono text-[9px] px-1 py-0.5 rounded border border-border bg-bg">?</span>
        </button>
      </div>

      {/* Keyboard shortcuts help modal */}
      <AnimatePresence>
        {helpOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setHelpOpen(false)}
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <Keyboard size={14} className="text-accent" />
                  <span className="text-text-primary font-semibold text-sm">Keyboard Shortcuts</span>
                </div>
                <button onClick={() => setHelpOpen(false)} className="text-text-secondary hover:text-text-primary transition-colors">
                  <X size={14} />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3">
                <p className="text-text-secondary text-xs mb-3">Press <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-bg text-text-primary">G</kbd> then a letter to jump to any page</p>
                <div className="space-y-1">
                  {navItems.filter(n => n.shortcut).map(({ label, shortcut }) => (
                    <div key={shortcut} className="flex items-center justify-between py-1">
                      <span className="text-text-secondary text-xs">{label}</span>
                      <div className="flex items-center gap-1">
                        <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-bg text-text-primary">G</kbd>
                        <span className="text-text-secondary text-[10px]">then</span>
                        <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-bg text-text-primary">{shortcut}</kbd>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-text-secondary text-xs">Show / hide this panel</span>
                    <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-bg text-text-primary">?</kbd>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-text-secondary text-xs">Dismiss</span>
                    <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-bg text-text-primary">Esc</kbd>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </aside>
  )
}
