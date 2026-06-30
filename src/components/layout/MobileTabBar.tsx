// src/components/layout/MobileTabBar.tsx
import { NavLink } from 'react-router-dom'
import { Zap, LayoutDashboard, TrendingUp, AlertTriangle, Map } from 'lucide-react'

const tabs = [
  { path: '/today',   icon: Zap,             label: 'Today'     },
  { path: '/',        icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/sprint',  icon: TrendingUp,      label: 'Sprint'    },
  { path: '/burnout', icon: AlertTriangle,   label: 'Burnout'   },
  { path: '/roadmap', icon: Map,             label: 'Roadmap'   },
]

export function MobileTabBar() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex">
      {tabs.map(({ path, icon: Icon, label }) => (
        <NavLink
          key={path}
          to={path}
          end={path === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-xs font-medium transition-colors ${
              isActive ? 'text-accent' : 'text-text-secondary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} className={isActive ? 'text-accent' : 'text-text-secondary'} />
              <span>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
