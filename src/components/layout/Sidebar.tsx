// src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, User, AlertTriangle, Calculator, Plug, Building2 } from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { path: '/',           icon: LayoutDashboard, label: 'Executive Dashboard' },
  { path: '/sprint',     icon: TrendingUp,      label: 'Sprint Prediction' },
  { path: '/briefing',   icon: User,            label: 'Developer Briefing' },
  { path: '/burnout',    icon: AlertTriangle,   label: 'Burnout Risk' },
  { path: '/roi',        icon: Calculator,      label: 'ROI Calculator' },
]

const settingsItems = [
  { path: '/settings/integrations', icon: Plug,      label: 'Integrations' },
  { path: '/settings/company',      icon: Building2, label: 'Company' },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-60 h-screen bg-card border-r border-border flex-col fixed left-0 top-0 z-40">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">DP</span>
          </div>
          <div>
            <p className="text-text-primary font-semibold text-sm">DevPulse AI</p>
            <p className="text-text-secondary text-xs">NovaTech Ltd.</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => (
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
                {label}
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
