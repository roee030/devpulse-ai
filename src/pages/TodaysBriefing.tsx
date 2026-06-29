// src/pages/TodaysBriefing.tsx
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Eye, CheckCircle, ChevronRight, Zap } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { AiInsightCard } from '../components/ui/AiInsightCard'
import {
  sprint, companyHealthScore, getTeamById,
} from '../data/mockData'

// ── Types ───────────────────────────────────────────────────────────────────
interface BriefingItem {
  id: string
  title: string
  subtitle: string
  route: string
  tag?: string
}

// ── Card ─────────────────────────────────────────────────────────────────────
function BriefingCard({
  item, tint, delay,
}: {
  item: BriefingItem
  tint: 'red' | 'yellow' | 'green'
  delay: number
}) {
  const navigate = useNavigate()
  const borderColor = tint === 'red' ? 'border-l-danger' : tint === 'yellow' ? 'border-l-warning' : 'border-l-success'
  const tagColor    = tint === 'red' ? 'bg-danger/10 text-danger' : tint === 'yellow' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'

  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      onClick={() => navigate(item.route)}
      className={`w-full text-left bg-card border border-border border-l-4 ${borderColor} rounded-xl p-4 hover:bg-white/[0.03] transition-colors group card-glow`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {item.tag && (
            <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded mb-2 ${tagColor}`}>
              {item.tag}
            </span>
          )}
          <p className="text-text-primary text-sm font-medium leading-snug">{item.title}</p>
          <p className="text-text-secondary text-xs mt-1 leading-relaxed">{item.subtitle}</p>
        </div>
        <ChevronRight size={15} className="text-border group-hover:text-text-secondary transition-colors mt-0.5 flex-shrink-0" />
      </div>
    </motion.button>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({
  icon: Icon, label, color, items, tint, startDelay,
}: {
  icon: typeof AlertTriangle
  label: string
  color: string
  items: BriefingItem[]
  tint: 'red' | 'yellow' | 'green'
  startDelay: number
}) {
  if (items.length === 0) return null
  return (
    <div className="mb-8">
      <div className={`flex items-center gap-2 mb-4 ${color}`}>
        <Icon size={16} />
        <span className="text-sm font-semibold uppercase tracking-wider">{label}</span>
        <span className="ml-auto text-xs font-medium opacity-70">{items.length}</span>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <BriefingCard key={item.id} item={item} tint={tint} delay={startDelay + i * 0.05} />
        ))}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function TodaysBriefing() {
  const { visibleDevelopers, visibleTeams, activeUser } = useUser()

  const today = new Date()
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
  const weekNumber = Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 24 * 3600 * 1000))

  // ── Needs Action (🔴) ──────────────────────────────────────────────────────
  const needsAction = useMemo<BriefingItem[]>(() => {
    const items: BriefingItem[] = []

    // Critical burnout developers
    const criticalDevs = visibleDevelopers.filter(d => d.riskLevel === 'critical')
    if (criticalDevs.length > 0) {
      const names = criticalDevs.map(d => d.name.split(' ')[0]).join(' & ')
      items.push({
        id: 'burnout-critical',
        title: `${names} ${criticalDevs.length === 1 ? 'is' : 'are'} at critical burnout risk`,
        subtitle: criticalDevs.map(d => d.riskSignal).join(' · '),
        route: '/burnout',
        tag: 'Burnout',
      })
    }

    // PRs stale > 20h
    const stalePRDevs = visibleDevelopers.filter(d => d.prStatus && d.prStatus.waitingHours >= 20)
    if (stalePRDevs.length > 0) {
      const worst = stalePRDevs.sort((a, b) => (b.prStatus?.waitingHours ?? 0) - (a.prStatus?.waitingHours ?? 0))[0]
      items.push({
        id: 'stale-prs',
        title: `${stalePRDevs.length} PR${stalePRDevs.length > 1 ? 's' : ''} stale for 20+ hours`,
        subtitle: `Longest: PR #${worst.prStatus?.number} by ${worst.name} — ${worst.prStatus?.waitingHours}h without review`,
        route: '/briefing',
        tag: 'Code Review',
      })
    }

    // Sprint behind pace
    const sprintPct = Math.round((sprint.completedPoints / sprint.totalPoints) * 100)
    if (sprintPct < 65) {
      items.push({
        id: 'sprint-behind',
        title: `Sprint is ${100 - sprintPct}% behind target with ${sprint.totalPoints - sprint.completedPoints} points remaining`,
        subtitle: `${sprint.completedPoints}/${sprint.totalPoints} pts complete — AI predicts ${Math.round((sprint.projectedPoints / sprint.totalPoints) * 100)}% completion by end of sprint`,
        route: '/sprint',
        tag: 'Sprint',
      })
    }

    // Blocked tasks
    const blockedCount = visibleDevelopers.reduce((s, d) => s + d.tasks.filter(t => t.status === 'blocked').length, 0)
    if (blockedCount >= 3) {
      items.push({
        id: 'blocked-tasks',
        title: `${blockedCount} blocked tasks across the sprint`,
        subtitle: sprint.topBlockers[0]?.description + ' is the primary blocker',
        route: '/sprint',
        tag: 'Blockers',
      })
    }

    return items
  }, [visibleDevelopers])

  // ── Watch (🟡) ─────────────────────────────────────────────────────────────
  const watch = useMemo<BriefingItem[]>(() => {
    const items: BriefingItem[] = []

    // At-risk developers
    const atRiskDevs = visibleDevelopers.filter(d => d.riskLevel === 'at-risk')
    if (atRiskDevs.length > 0) {
      items.push({
        id: 'at-risk-devs',
        title: `${atRiskDevs.length} developer${atRiskDevs.length > 1 ? 's' : ''} showing early warning signs`,
        subtitle: atRiskDevs.map(d => d.name.split(' ')[0]).join(', ') + ' — monitor this week',
        route: '/burnout',
        tag: 'Wellbeing',
      })
    }

    // Teams with low health
    const lowHealthTeams = visibleTeams.filter(t => t.healthScore < 65)
    if (lowHealthTeams.length > 0) {
      items.push({
        id: 'low-health-teams',
        title: `${lowHealthTeams.map(t => t.name).join(' & ')} health score below 65`,
        subtitle: `Mobile Team at ${lowHealthTeams[0].healthScore}/100 — consider checking in with team lead`,
        route: '/',
        tag: 'Team Health',
      })
    }

    // Velocity trend down
    const downTrendDevs = visibleDevelopers.filter(d => d.velocityTrend === 'down')
    if (downTrendDevs.length >= 3) {
      items.push({
        id: 'velocity-down',
        title: `${downTrendDevs.length} developers have declining velocity this week`,
        subtitle: 'May indicate overload, blockers, or context switching — review task assignments',
        route: '/sprint',
        tag: 'Velocity',
      })
    }

    // Watch developers
    const watchDevs = visibleDevelopers.filter(d => d.riskLevel === 'watch')
    if (watchDevs.length > 0 && atRiskDevs.length === 0) {
      items.push({
        id: 'watch-devs',
        title: `${watchDevs.length} developer${watchDevs.length > 1 ? 's' : ''} worth monitoring`,
        subtitle: watchDevs.map(d => `${d.name.split(' ')[0]}: ${d.riskSignal}`).slice(0, 2).join(' · '),
        route: '/burnout',
        tag: 'Wellbeing',
      })
    }

    return items
  }, [visibleDevelopers, visibleTeams])

  // ── On Track (🟢) ──────────────────────────────────────────────────────────
  const onTrack = useMemo<BriefingItem[]>(() => {
    const items: BriefingItem[] = []

    const healthyDevs   = visibleDevelopers.filter(d => d.riskLevel === 'healthy')
    const healthyTeams  = visibleTeams.filter(t => t.healthScore >= 75)

    if (healthyTeams.length > 0) {
      items.push({
        id: 'healthy-teams',
        title: `${healthyTeams.length} team${healthyTeams.length > 1 ? 's' : ''} performing above 75 health score`,
        subtitle: healthyTeams.map(t => {
          const team = getTeamById(t.id)
          return team ? `${team.name} (${t.healthScore}/100)` : ''
        }).filter(Boolean).join(' · '),
        route: '/',
        tag: 'Health',
      })
    }

    if (healthyDevs.length > 0) {
      items.push({
        id: 'healthy-devs',
        title: `${healthyDevs.length} developer${healthyDevs.length > 1 ? 's are' : ' is'} healthy — no signals this week`,
        subtitle: 'Consistent commit patterns, no blockers, velocity on track',
        route: '/briefing',
        tag: 'Wellbeing',
      })
    }

    const completedTasks = visibleDevelopers.reduce((s, d) => s + d.tasks.filter(t => t.status === 'done').length, 0)
    if (completedTasks > 0) {
      items.push({
        id: 'completed-tasks',
        title: `${completedTasks} tasks completed across the sprint`,
        subtitle: 'Team is delivering. Focus on unblocking the remaining critical path items.',
        route: '/sprint',
        tag: 'Progress',
      })
    }

    return items
  }, [visibleDevelopers, visibleTeams])

  // ── AI Insight ─────────────────────────────────────────────────────────────
  const insightText = useMemo(() => {
    const critCount = visibleDevelopers.filter(d => d.riskLevel === 'critical').length
    const blockedCount = visibleDevelopers.reduce((s, d) => s + d.tasks.filter(t => t.status === 'blocked').length, 0)
    const parts: string[] = []
    if (needsAction.length > 0) parts.push(`${needsAction.length} item${needsAction.length > 1 ? 's' : ''} need your action today`)
    if (critCount > 0) parts.push(`${critCount} developer${critCount > 1 ? 's are' : ' is'} at critical burnout risk`)
    if (blockedCount > 0) parts.push(`${blockedCount} tasks are blocked`)
    return parts.length > 0 ? parts.join(' · ') + '.' : `All systems healthy today — ${visibleDevelopers.filter(d => d.riskLevel === 'healthy').length} developers on track.`
  }, [needsAction, visibleDevelopers])

  const scopeLabel = activeUser.role === 'cto' ? 'company-wide' : activeUser.role === 'divisionHead' ? 'your division' : 'your team'

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
              <Zap size={20} className="text-warning" />
              Today's Briefing
            </h1>
            <p className="text-text-secondary text-sm mt-1">{dateLabel} · Week {weekNumber} · {scopeLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              companyHealthScore >= 75 ? 'bg-success/10 text-success border-success/20'
              : companyHealthScore >= 50 ? 'bg-warning/10 text-warning border-warning/20'
              : 'bg-danger/10 text-danger border-danger/20'
            }`}>
              {companyHealthScore}/100 Health
            </span>
          </div>
        </div>
      </motion.div>

      {/* AI Insight */}
      <AiInsightCard text={insightText} />

      {/* Sections */}
      <div className="mt-6">
        <Section
          icon={AlertTriangle}
          label="Needs Action"
          color="text-danger"
          items={needsAction}
          tint="red"
          startDelay={0.1}
        />
        <Section
          icon={Eye}
          label="Watch"
          color="text-warning"
          items={watch}
          tint="yellow"
          startDelay={0.2}
        />
        <Section
          icon={CheckCircle}
          label="On Track"
          color="text-success"
          items={onTrack}
          tint="green"
          startDelay={0.3}
        />

        {needsAction.length === 0 && watch.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <CheckCircle size={40} className="text-success mx-auto mb-3 opacity-60" />
            <p className="text-text-primary font-semibold">All clear today</p>
            <p className="text-text-secondary text-sm mt-1">No urgent items. Keep up the great work.</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
