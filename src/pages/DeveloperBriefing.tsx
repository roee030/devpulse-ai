// src/pages/DeveloperBriefing.tsx
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, X, AlertTriangle, Zap } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { DeveloperCard } from '../components/ui/DeveloperCard'
import { HealthRing } from '../components/ui/HealthRing'
import { Developer, RiskLevel, getTeamById, users } from '../data/mockData'

const RISK_LEVELS: RiskLevel[] = ['critical', 'at-risk', 'watch', 'healthy']
const RISK_ORDER: Record<RiskLevel, number> = { critical: 0, 'at-risk': 1, watch: 2, healthy: 3 }

const riskPillActive: Record<RiskLevel, string> = {
  critical: 'border-danger text-danger bg-danger/10',
  'at-risk': 'border-warning text-warning bg-warning/10',
  watch:     'border-accent text-accent bg-accent/10',
  healthy:   'border-success text-success bg-success/10',
}

interface BriefingFilters {
  teamIds:    string[]
  riskLevels: RiskLevel[]
  sort:       'risk' | 'velocity' | 'none'
}

export function DeveloperBriefing() {
  const { activeUser, visibleDevelopers } = useUser()
  const isSoloView = activeUser.role === 'developer'

  const [filters,        setFilters]        = useState<BriefingFilters>({ teamIds: [], riskLevels: [], sort: 'none' })
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set())
  const [expandedDevId,  setExpandedDevId]  = useState<string | null>(null)

  const visibleTeamsList = useMemo(() => {
    const seen = new Set<string>()
    const result = []
    for (const dev of visibleDevelopers) {
      if (!seen.has(dev.teamId)) {
        seen.add(dev.teamId)
        const team = getTeamById(dev.teamId)
        if (team) result.push(team)
      }
    }
    return result
  }, [visibleDevelopers])

  const filteredDevsByTeam = useMemo(() => {
    const result: Record<string, Developer[]> = {}
    for (const team of visibleTeamsList) {
      if (filters.teamIds.length > 0 && !filters.teamIds.includes(team.id)) continue
      let devs = visibleDevelopers.filter(d => d.teamId === team.id)
      if (filters.riskLevels.length > 0) devs = devs.filter(d => filters.riskLevels.includes(d.riskLevel))
      if (filters.sort === 'risk')     devs = [...devs].sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel])
      if (filters.sort === 'velocity') devs = [...devs].sort((a, b) => a.velocity - b.velocity)
      if (devs.length > 0) result[team.id] = devs
    }
    return result
  }, [visibleTeamsList, visibleDevelopers, filters])

  const totalVisible    = Object.values(filteredDevsByTeam).reduce((s, d) => s + d.length, 0)
  const hasActiveFilter = filters.teamIds.length > 0 || filters.riskLevels.length > 0

  function toggleRisk(level: RiskLevel) {
    setFilters(f => ({
      ...f,
      riskLevels: f.riskLevels.includes(level)
        ? f.riskLevels.filter(r => r !== level)
        : [...f.riskLevels, level],
    }))
  }

  function toggleTeamCollapse(teamId: string) {
    setCollapsedTeams(prev => {
      const next = new Set(prev)
      next.has(teamId) ? next.delete(teamId) : next.add(teamId)
      return next
    })
  }

  function clearFilters() {
    setFilters({ teamIds: [], riskLevels: [], sort: 'none' })
  }

  // ── Solo developer view ────────────────────────────────────────────────────
  if (isSoloView && visibleDevelopers[0]) {
    const dev = visibleDevelopers[0]
    const blockers = dev.tasks.filter(t => t.status === 'blocked')

    return (
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
            className="flex items-center gap-2 text-text-secondary text-sm mb-1"
          >
            <Sparkles size={14} className="text-accent" />
            <span>Daily Briefing</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-text-primary">Your AI-powered focus for today</h1>
        </div>

        {/* Developer profile card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl p-5 mb-4"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
              <span className="text-accent text-lg font-bold">{dev.initials}</span>
            </div>
            <div>
              <p className="text-text-primary font-semibold text-base">{dev.name}</p>
              <p className="text-text-secondary text-sm">{dev.role}</p>
              <p className="text-text-secondary text-xs mt-0.5">
                Last active: <span className="text-text-primary">{dev.lastActive}</span>
              </p>
            </div>
          </div>
          <p className="text-text-secondary text-sm italic leading-relaxed border-t border-border pt-3">
            "You're {Math.round((dev.velocity / 8) * 100)}% through your weekly velocity goal. Keep the momentum going."
          </p>
        </motion.div>

        {/* Blocker alert */}
        {blockers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-warning/10 border border-warning/30 rounded-xl p-4 mb-4 flex gap-3"
          >
            <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-warning text-sm font-medium">Blocker Detected</p>
              <p className="text-text-secondary text-xs mt-0.5 leading-relaxed">
                {blockers[0].title}{blockers.length > 1 && ` (+${blockers.length - 1} more)`}
              </p>
            </div>
          </motion.div>
        )}

        {/* Expandable developer card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <DeveloperCard
            dev={dev}
            expanded={expandedDevId === dev.id}
            onToggle={() => setExpandedDevId(p => p === dev.id ? null : dev.id)}
          />
        </motion.div>

        {/* Velocity stat */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="mt-4 flex items-center gap-3 bg-card border border-border rounded-xl p-4"
        >
          <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
            <Zap size={16} className="text-accent" />
          </div>
          <div>
            <p className="text-text-secondary text-xs">Weekly Velocity</p>
            <p className="text-text-primary font-bold text-lg">
              {dev.velocity} <span className="text-text-secondary text-sm font-normal">pts/day</span>
            </p>
          </div>
        </motion.div>

        {/* Start Focus Session CTA */}
        <motion.button
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }}
          className="mt-5 w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Zap size={16} />
          Start Focus Session
        </motion.button>
      </div>
    )
  }

  // ── Manager view ───────────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-2">
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">Developer Daily Briefing</h1>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex items-center gap-2 text-text-secondary text-sm mb-6"
      >
        <Sparkles size={14} className="text-accent" />
        <span>Your AI-powered focus for today</span>
      </motion.div>

      {/* Sticky filter bar */}
      <div className="sticky top-14 z-10 bg-bg border-b border-border py-3 flex gap-2 items-center flex-wrap mb-6 -mx-4 px-4 md:-mx-6 md:px-6">
        <select
          value={filters.teamIds[0] ?? ''}
          onChange={e => setFilters(f => ({ ...f, teamIds: e.target.value ? [e.target.value] : [] }))}
          className="bg-card border border-border text-text-primary text-sm rounded-lg px-3 py-1.5 cursor-pointer"
        >
          <option value="">All Teams</option>
          {visibleTeamsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        <div className="flex gap-1.5 flex-wrap">
          {RISK_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => toggleRisk(level)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                filters.riskLevels.includes(level)
                  ? riskPillActive[level]
                  : 'border-border text-text-secondary hover:border-text-secondary'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        <select
          value={filters.sort}
          onChange={e => setFilters(f => ({ ...f, sort: e.target.value as BriefingFilters['sort'] }))}
          className="bg-card border border-border text-text-primary text-sm rounded-lg px-3 py-1.5 cursor-pointer"
        >
          <option value="none">Sort: Default</option>
          <option value="risk">Risk ↓</option>
          <option value="velocity">Velocity ↑</option>
        </select>

        {hasActiveFilter && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Empty state */}
      {totalVisible === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <p className="text-text-secondary mb-3">No developers match these filters</p>
          <button onClick={clearFilters} className="text-accent text-sm hover:underline">Clear filters</button>
        </motion.div>
      )}

      {/* Team-grouped sections */}
      <div className="space-y-8">
        {visibleTeamsList
          .filter(team => !!filteredDevsByTeam[team.id])
          .map(team => {
            const teamDevs    = filteredDevsByTeam[team.id]
            const isCollapsed = collapsedTeams.has(team.id)
            const leadName    = users.find(u => u.id === team.leadId)?.name ?? '—'

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className="flex items-center justify-between cursor-pointer mb-4 pb-3 border-b border-border"
                  onClick={() => toggleTeamCollapse(team.id)}
                  role="button"
                  aria-expanded={!isCollapsed}
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && toggleTeamCollapse(team.id)}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-text-primary font-semibold">{team.name}</span>
                    <span className="text-text-secondary text-xs hidden sm:inline">Lead: {leadName}</span>
                    <HealthRing score={team.healthScore} size={28} />
                    <span className="text-text-secondary text-xs">
                      {teamDevs.length} dev{teamDevs.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} className="text-text-secondary flex-shrink-0" />
                  </motion.div>
                </div>

                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                        {teamDevs.map((dev, i) => (
                          <DeveloperCard
                            key={dev.id}
                            dev={dev}
                            delay={i * 0.04}
                            expanded={expandedDevId === dev.id}
                            onToggle={() => setExpandedDevId(p => p === dev.id ? null : dev.id)}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
      </div>
    </div>
  )
}
