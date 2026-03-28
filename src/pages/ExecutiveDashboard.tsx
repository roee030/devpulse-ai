// src/pages/ExecutiveDashboard.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GitPullRequest, AlertTriangle, Target, Zap, ChevronRight } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { HealthRing } from '../components/ui/HealthRing'
import { HealthBreakdown } from '../components/ui/HealthBreakdown'
import { MetricCard } from '../components/ui/MetricCard'
import { DeveloperCard } from '../components/ui/DeveloperCard'
import {
  companyHealthScore, companyStalePRs, companyAtRiskTasks,
  sprint, getDevelopersByTeam, getTeamsByDivision, getDivisionById, getTeamById,
  getHealthBreakdown, getAvgVelocityForTeam, getAvgVelocityForDivision,
} from '../data/mockData'
import type { Division, Team } from '../data/mockData'

// ── Types ──────────────────────────────────────────────────────────────────────
type DrillLevel = 'top' | 'division' | 'team'
interface DrillState {
  level: DrillLevel
  divisionId: string | null
  teamId: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function healthBorder(score: number) {
  if (score >= 75) return 'border-l-success'
  if (score >= 50) return 'border-l-warning'
  return 'border-l-danger'
}

function healthStatusLabel(score: number) {
  if (score >= 75) return { label: 'Optimal Performance', color: 'text-success' }
  if (score >= 50) return { label: 'Moderate Risk',       color: 'text-warning' }
  return             { label: 'Critical',                  color: 'text-danger'  }
}

// ── Grid slide variants ────────────────────────────────────────────────────────
const gridVariants = {
  enter:  (dir: 'forward' | 'back') => ({ opacity: 0, x: dir === 'forward' ?  24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: 'forward' | 'back') => ({ opacity: 0, x: dir === 'forward' ? -24 :  24 }),
}

// ── DivisionCard ──────────────────────────────────────────────────────────────
function DivisionCard({
  div, delay, showBreakdown, onToggleBreakdown, onClick,
}: {
  div: Division; delay: number
  showBreakdown: boolean
  onToggleBreakdown: (e: React.MouseEvent) => void
  onClick: () => void
}) {
  const divTeams  = getTeamsByDivision(div.id)
  const breakdown = getHealthBreakdown(div, getAvgVelocityForDivision(div.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`bg-card border border-border border-l-4 ${healthBorder(div.healthScore)} rounded-xl p-4 md:p-5 cursor-pointer card-glow`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-text-primary font-semibold truncate">{div.name}</p>
          <p className="text-text-secondary text-xs mt-0.5">{divTeams.length} teams</p>
        </div>
        <div
          onClick={onToggleBreakdown}
          className="cursor-pointer flex-shrink-0"
          title="View health breakdown"
        >
          <HealthRing score={div.healthScore} size={60} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><p className="text-text-secondary text-xs">Stale PRs</p><p className="text-warning font-semibold">{div.stalePRs}</p></div>
        <div><p className="text-text-secondary text-xs">At Risk</p><p className="text-danger font-semibold">{div.atRiskTasks}</p></div>
        <div><p className="text-text-secondary text-xs">Points</p><p className="text-text-primary font-semibold text-sm">{div.completedPoints}/{div.totalPoints}</p></div>
      </div>
      <AnimatePresence>
        {showBreakdown && <HealthBreakdown {...breakdown} />}
      </AnimatePresence>
    </motion.div>
  )
}

// ── TeamCard ──────────────────────────────────────────────────────────────────
function TeamCard({
  team, delay, showBreakdown, onToggleBreakdown, onClick,
}: {
  team: Team; delay: number
  showBreakdown: boolean
  onToggleBreakdown: (e: React.MouseEvent) => void
  onClick: () => void
}) {
  const devs      = getDevelopersByTeam(team.id)
  const breakdown = getHealthBreakdown(team, getAvgVelocityForTeam(team.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`bg-card border border-border border-l-4 ${healthBorder(team.healthScore)} rounded-xl p-4 md:p-5 cursor-pointer card-glow`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-text-primary font-semibold truncate">{team.name}</p>
          <p className="text-text-secondary text-xs mt-0.5">{devs.length} developers</p>
        </div>
        <div
          onClick={onToggleBreakdown}
          className="cursor-pointer flex-shrink-0"
          title="View health breakdown"
        >
          <HealthRing score={team.healthScore} size={56} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><p className="text-text-secondary text-xs">Stale PRs</p><p className="text-warning font-semibold">{team.stalePRs}</p></div>
        <div><p className="text-text-secondary text-xs">At Risk</p><p className="text-danger font-semibold">{team.atRiskTasks}</p></div>
        <div><p className="text-text-secondary text-xs">Points</p><p className="text-text-primary font-semibold text-sm">{team.completedPoints}/{team.totalPoints}</p></div>
      </div>
      <AnimatePresence>
        {showBreakdown && <HealthBreakdown {...breakdown} />}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function ExecutiveDashboard() {
  const { activeUser, visibleDivisions, visibleTeams, visibleDevelopers } = useUser()

  // Drill-down state — initial level based on role
  const [drill, setDrill] = useState<DrillState>(() => {
    if (activeUser.role === 'divisionHead') return { level: 'division', divisionId: activeUser.divisionId!, teamId: null }
    if (activeUser.role === 'teamLead')     return { level: 'team',     divisionId: activeUser.divisionId!, teamId: activeUser.teamId! }
    return { level: 'top', divisionId: null, teamId: null }
  })
  const [drillDir,      setDrillDir]      = useState<'forward' | 'back'>('forward')
  const [expandedDevId, setExpandedDevId] = useState<string | null>(null)
  const [showMainBreakdown, setShowMainBreakdown] = useState(false)
  const [cardBreakdownId,   setCardBreakdownId]   = useState<string | null>(null)

  // Navigation helpers
  function drillIntoDiv(divId: string) {
    setDrillDir('forward'); setDrill({ level: 'division', divisionId: divId, teamId: null }); setExpandedDevId(null); setCardBreakdownId(null); setShowMainBreakdown(false)
  }
  function drillIntoTeam(divId: string, teamId: string) {
    setDrillDir('forward'); setDrill({ level: 'team', divisionId: divId, teamId }); setExpandedDevId(null); setCardBreakdownId(null); setShowMainBreakdown(false)
  }
  function drillBackTo(level: DrillLevel, divisionId: string | null = null) {
    setDrillDir('back'); setDrill({ level, divisionId, teamId: null }); setExpandedDevId(null); setCardBreakdownId(null); setShowMainBreakdown(false)
  }
  function toggleCardBreakdown(e: React.MouseEvent, id: string) {
    e.stopPropagation(); setCardBreakdownId(prev => prev === id ? null : id)
  }

  // Derived display values
  const currentDivision = drill.divisionId ? getDivisionById(drill.divisionId) : null
  const currentTeam     = drill.teamId     ? getTeamById(drill.teamId)         : null

  const displayHealthScore =
    drill.level === 'team'     && drill.teamId     ? (getTeamById(drill.teamId)?.healthScore     ?? 0)
    : drill.level === 'division' && drill.divisionId ? (getDivisionById(drill.divisionId)?.healthScore ?? 0)
    : activeUser.role === 'cto'         ? companyHealthScore
    : activeUser.role === 'divisionHead'? (visibleDivisions[0]?.healthScore ?? 0)
    : activeUser.role === 'teamLead'    ? (visibleTeams[0]?.healthScore     ?? 0)
    : 0

  const displayStalePRs =
    activeUser.role === 'cto' ? companyStalePRs
    : visibleTeams.reduce((s, t) => s + t.stalePRs, 0) || visibleDivisions.reduce((s, d) => s + d.stalePRs, 0)

  const displayAtRisk =
    activeUser.role === 'cto' ? companyAtRiskTasks
    : visibleTeams.reduce((s, t) => s + t.atRiskTasks, 0) || visibleDivisions.reduce((s, d) => s + d.atRiskTasks, 0)

  const avgVelocity = visibleDevelopers.length
    ? Math.round((visibleDevelopers.reduce((s, d) => s + d.velocity, 0) / visibleDevelopers.length) * 10) / 10
    : 0

  // Main ring breakdown entity
  const mainEntity =
    drill.level === 'team'     && drill.teamId     ? getTeamById(drill.teamId)
    : drill.level === 'division' && drill.divisionId ? getDivisionById(drill.divisionId)
    : null

  const mainBreakdownAvgVel =
    drill.level === 'team'     && drill.teamId     ? getAvgVelocityForTeam(drill.teamId)
    : drill.level === 'division' && drill.divisionId ? getAvgVelocityForDivision(drill.divisionId)
    : avgVelocity

  const mainBreakdownData = mainEntity ? getHealthBreakdown(mainEntity, mainBreakdownAvgVel) : null

  const { label: statusLabel, color: statusColor } = healthStatusLabel(displayHealthScore)

  const teamsForDivision = drill.divisionId ? getTeamsByDivision(drill.divisionId) : []
  const devsForTeam      = drill.teamId     ? getDevelopersByTeam(drill.teamId)    : visibleDevelopers
  const gridKey = `${drill.level}-${drill.divisionId ?? ''}-${drill.teamId ?? ''}`

  return (
    <div>
      {/* Page header */}
      <div className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-text-primary">Executive Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">{sprint.name} · {sprint.completedPoints}/{sprint.totalPoints} pts</p>
      </div>

      {/* Health score + Metrics */}
      <div className="flex flex-col lg:flex-row gap-4 md:gap-6 mb-6 md:mb-8">

        {/* Health ring card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border rounded-xl p-5 md:p-6 flex flex-col items-center justify-center lg:min-w-[220px]"
        >
          {/* Mobile: horizontal layout; Desktop: vertical stack */}
          <div className="flex items-center gap-5 lg:flex-col lg:gap-0 w-full lg:w-auto">
            <HealthRing score={displayHealthScore} size={120} />
            <div className="flex-1 lg:flex-none lg:text-center">
              <p className="text-text-secondary text-sm mt-0 lg:mt-3">Team Health Score</p>
              <p className={`text-xs font-semibold mt-1 flex items-center gap-1 lg:justify-center ${statusColor}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current inline-block" />
                {statusLabel}
              </p>
              {mainBreakdownData && (
                <button
                  onClick={() => setShowMainBreakdown(p => !p)}
                  className="mt-2 text-accent text-xs hover:underline"
                >
                  {showMainBreakdown ? 'Hide breakdown' : 'View breakdown'}
                </button>
              )}
            </div>
          </div>
          <AnimatePresence>
            {showMainBreakdown && mainBreakdownData && (
              <div className="w-full mt-1">
                <HealthBreakdown {...mainBreakdownData} />
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Metric tiles — 2×2 on mobile, 4-wide on xl */}
        <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
          <MetricCard label="Stale PRs"        value={displayStalePRs} color="warning" icon={<GitPullRequest size={16} />} trend="up"     trendLabel="vs last sprint"                                              delay={0.1}  />
          <MetricCard label="At-Risk Tasks"    value={displayAtRisk}   color="danger"  icon={<AlertTriangle  size={16} />} trend="up"     trendLabel={`${Math.round((displayAtRisk / sprint.totalPoints) * 100)}% of sprint`} delay={0.15} />
          <MetricCard label="Sprint Points"    value={sprint.completedPoints} unit={`/${sprint.totalPoints}`} color="default" icon={<Target size={16} />} trend="stable" trendLabel="points done"          delay={0.2}  />
          <MetricCard label="Avg Velocity"     value={avgVelocity}     unit=" pts/day" color="success" icon={<Zap size={16} />}            trend="stable" trendLabel="across team"                           delay={0.25} />
        </div>
      </div>

      {/* Developer solo view */}
      {activeUser.role === 'developer' && visibleDevelopers[0] && (
        <div className="max-w-md">
          <h2 className="text-text-primary font-semibold mb-4">Your Summary</h2>
          <DeveloperCard dev={visibleDevelopers[0]} />
        </div>
      )}

      {/* Drill-down section */}
      {activeUser.role !== 'developer' && (
        <div>
          {/* Breadcrumb */}
          {drill.level !== 'top' && (
            <motion.nav
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              aria-label="Drill-down navigation"
              className="flex items-center gap-1 text-sm mb-4 flex-wrap"
            >
              <button onClick={() => drillBackTo('top')} className="text-text-secondary hover:text-text-primary transition-colors">
                NovaTech
              </button>
              {currentDivision && (
                <>
                  <ChevronRight size={14} className="text-border flex-shrink-0" />
                  {drill.level === 'division' ? (
                    <span className="text-text-primary font-medium">{currentDivision.name}</span>
                  ) : (
                    <button onClick={() => drillBackTo('division', drill.divisionId)} className="text-text-secondary hover:text-text-primary transition-colors">
                      {currentDivision.name}
                    </button>
                  )}
                </>
              )}
              {currentTeam && drill.level === 'team' && (
                <>
                  <ChevronRight size={14} className="text-border flex-shrink-0" />
                  <span className="text-text-primary font-medium">{currentTeam.name}</span>
                </>
              )}
            </motion.nav>
          )}

          {/* Section label */}
          <h2 className="text-text-primary font-semibold mb-4">
            {drill.level === 'top'      && 'Divisions'}
            {drill.level === 'division' && `Teams in ${currentDivision?.name ?? '…'}`}
            {drill.level === 'team'     && `Developers · ${currentTeam?.name ?? '…'}`}
          </h2>

          {/* Animated grid */}
          <AnimatePresence mode="wait" custom={drillDir}>
            <motion.div
              key={gridKey}
              custom={drillDir}
              variants={gridVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25 }}
            >
              {/* Top — Divisions */}
              {drill.level === 'top' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleDivisions.map((div, i) => (
                    <DivisionCard
                      key={div.id} div={div} delay={i * 0.05}
                      showBreakdown={cardBreakdownId === div.id}
                      onToggleBreakdown={e => toggleCardBreakdown(e, div.id)}
                      onClick={() => drillIntoDiv(div.id)}
                    />
                  ))}
                </div>
              )}

              {/* Division — Teams */}
              {drill.level === 'division' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {teamsForDivision.map((team, i) => (
                    <TeamCard
                      key={team.id} team={team} delay={i * 0.05}
                      showBreakdown={cardBreakdownId === team.id}
                      onToggleBreakdown={e => toggleCardBreakdown(e, team.id)}
                      onClick={() => drillIntoTeam(drill.divisionId!, team.id)}
                    />
                  ))}
                </div>
              )}

              {/* Team — Developers */}
              {drill.level === 'team' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {devsForTeam.map((dev, i) => (
                    <DeveloperCard
                      key={dev.id} dev={dev} delay={i * 0.05}
                      expanded={expandedDevId === dev.id}
                      onToggle={() => setExpandedDevId(prev => prev === dev.id ? null : dev.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
