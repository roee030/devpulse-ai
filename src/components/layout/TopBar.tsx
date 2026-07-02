// src/components/layout/TopBar.tsx
import { useState, useMemo } from 'react'
import { Bell, ChevronDown, Check, X, AlertTriangle, GitPullRequest, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import { useCompanyName } from '../../context/CompanyContext'
import { useUnifiedData } from '../../context/UnifiedDataContext'
import { User } from '../../data/mockData'

const roleLabel: Record<string, string> = {
  cto: 'C-Level',
  divisionHead: 'Division Head',
  teamLead: 'Team Lead',
  developer: 'Developer',
}

const roleGroups = [
  { label: 'C-Level', role: 'cto' },
  { label: 'Division Heads', role: 'divisionHead' },
  { label: 'Team Leads', role: 'teamLead' },
  { label: 'Developers', role: 'developer' },
]

interface Alert { id: string; icon: React.ElementType; color: string; title: string; sub: string }

export function TopBar() {
  const { activeUser, setActiveUser, users, visibleDevelopers } = useUser()
  const { companyName } = useCompanyName()
  const { allPRs, sprint } = useUnifiedData()
  const [open, setOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)

  const alerts = useMemo<Alert[]>(() => {
    const list: Alert[] = []

    // Critical burnout risk developers
    const critical = visibleDevelopers.filter(d => d.riskLevel === 'critical').slice(0, 2)
    for (const dev of critical) {
      list.push({
        id: `burnout-${dev.id}`,
        icon: AlertTriangle,
        color: 'text-danger',
        title: `${dev.name.split(' ')[0]} — critical burnout risk`,
        sub: dev.riskSignal,
      })
    }

    // Stale PRs (open + waiting >12h)
    const stalePRs = allPRs.filter(p => (p.status === 'open' || p.status === 'changes-requested') && p.waitingHours > 12).slice(0, 2)
    for (const pr of stalePRs) {
      const label = pr.linkedTaskKey ? `PR for ${pr.linkedTaskKey}` : 'Open PR'
      list.push({
        id: `pr-${pr.id}`,
        icon: GitPullRequest,
        color: 'text-warning',
        title: `${label} awaiting review`,
        sub: `Open ${Math.round(pr.waitingHours)}h — needs attention`,
      })
    }

    // Sprint risk
    const completionPct = Math.round((sprint.projectedPoints / sprint.totalPoints) * 100)
    if (completionPct < 85) {
      list.push({
        id: 'sprint-risk',
        icon: Zap,
        color: 'text-accent',
        title: `Sprint projected at ${completionPct}%`,
        sub: `${sprint.topBlockers.length} active blocker${sprint.topBlockers.length !== 1 ? 's' : ''} — ${sprint.name.split('–')[0].trim()}`,
      })
    }

    return list.slice(0, 5)
  }, [visibleDevelopers, allPRs, sprint])

  return (
    <header className="hidden md:flex h-14 bg-card border-b border-border items-center justify-between px-6 fixed top-0 left-60 right-0 z-30">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-secondary">{companyName || 'DevPulse'}</span>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">{activeUser.title}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => { setBellOpen(v => !v); setOpen(false) }}
            className="relative text-text-secondary hover:text-text-primary transition-colors p-1"
          >
            <Bell size={18} />
            {alerts.length > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full pulse-red" />
            )}
          </button>

          <AnimatePresence>
            {bellOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-text-primary text-sm font-semibold">Alerts</span>
                  <button onClick={() => setBellOpen(false)} className="text-text-secondary hover:text-text-primary transition-colors">
                    <X size={14} />
                  </button>
                </div>
                {alerts.length === 0 ? (
                  <p className="text-text-secondary text-xs text-center py-6">No active alerts</p>
                ) : (
                  <div className="divide-y divide-border">
                    {alerts.map(alert => {
                      const Icon = alert.icon
                      return (
                        <div key={alert.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                          <Icon size={14} className={`mt-0.5 flex-shrink-0 ${alert.color}`} />
                          <div className="min-w-0">
                            <p className="text-text-primary text-xs font-medium leading-snug">{alert.title}</p>
                            <p className="text-text-secondary text-[11px] mt-0.5 leading-relaxed truncate">{alert.sub}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => { setOpen(v => !v); setBellOpen(false) }}
            className="flex items-center gap-2.5 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm hover:border-accent/50 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-xs font-semibold">
                {(activeUser.name ?? '?').split(' ').map(n => n[0] ?? '').join('').slice(0, 2)}
              </span>
            </div>
            <div className="text-left">
              <p className="text-text-primary font-medium text-xs leading-tight">{activeUser.name}</p>
              <p className="text-text-secondary text-xs leading-tight">{roleLabel[activeUser.role]}</p>
            </div>
            <ChevronDown size={14} className={`text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {roleGroups.map(group => {
                  const groupUsers = users.filter(u => u.role === group.role)
                  if (!groupUsers.length) return null
                  return (
                    <div key={group.role}>
                      <div className="px-3 pt-3 pb-1">
                        <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">{group.label}</p>
                      </div>
                      {groupUsers.map((user: User) => (
                        <button
                          key={user.id}
                          onClick={() => { setActiveUser(user); setOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-accent text-xs font-semibold">
                              {(user.name ?? '?').split(' ').map(n => n[0] ?? '').join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text-primary text-xs font-medium truncate">{user.name}</p>
                            <p className="text-text-secondary text-xs truncate">{user.title}</p>
                          </div>
                          {activeUser.id === user.id && <Check size={13} className="text-accent flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
