# DevPulse Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add drill-down navigation, health score breakdowns, and a redesigned developer briefing to DevPulse AI.

**Architecture:** Drill-down state lives in `ExecutiveDashboard` as local React state (no router changes). A new `HealthBreakdown` component is reused wherever a HealthRing is clicked. `DeveloperCard` gains optional `expanded`/`onToggle` props with an `AnimatePresence` expansion panel. `DeveloperBriefing` is rebuilt with team-grouped collapsible sections and a sticky filter bar.

**Tech Stack:** React 18, TypeScript, Tailwind CSS (custom tokens), Framer Motion (`AnimatePresence`, `motion.div`), Lucide React icons.

---

### Task 1: Add health breakdown helpers to mockData.ts

**Files:**
- Modify: `src/data/mockData.ts`

**Step 1: Add the `HealthBreakdownData` interface and helper functions at the bottom of mockData.ts, after the existing helpers**

The `Team` and `Division` types already have `stalePRs`, `atRiskTasks`, `completedPoints`, `totalPoints`. We need a derived breakdown object and two velocity helpers.

Append these exports after the existing helpers block (after `export const companyAtRiskTasks = ...`):

```ts
// ─── Health Breakdown ─────────────────────────────────────────────────────────
export interface HealthBreakdownData {
  jiraScore: number
  githubScore: number
  onTimePct: number
  blockedTasks: number
  prMergeRate: number
  avgVelocity: number
  stalePRs: number
}

export function getAvgVelocityForTeam(teamId: string): number {
  const devs = getDevelopersByTeam(teamId)
  if (!devs.length) return 0
  return Math.round((devs.reduce((s, d) => s + d.velocity, 0) / devs.length) * 10) / 10
}

export function getAvgVelocityForDivision(divisionId: string): number {
  const devs = getDevelopersByDivision(divisionId)
  if (!devs.length) return 0
  return Math.round((devs.reduce((s, d) => s + d.velocity, 0) / devs.length) * 10) / 10
}

export function getHealthBreakdown(
  entity: { stalePRs: number; atRiskTasks: number; completedPoints: number; totalPoints: number },
  avgVelocity: number
): HealthBreakdownData {
  const onTimePct = Math.round((entity.completedPoints / entity.totalPoints) * 100)
  const jiraScore = onTimePct
  // Approximate totalPRs: assume activePRs = stalePRs * 3 (at least 5)
  const activePRs = Math.max(5, entity.stalePRs * 3)
  const totalPRs = entity.stalePRs + activePRs
  const prMergeRate = Math.round((activePRs / totalPRs) * 100)
  const velocityScore = Math.round(Math.min(avgVelocity / 8, 1) * 100)
  const githubScore = Math.round((prMergeRate + velocityScore) / 2)
  return {
    jiraScore,
    githubScore,
    onTimePct,
    blockedTasks: entity.atRiskTasks,
    prMergeRate,
    avgVelocity,
    stalePRs: entity.stalePRs,
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/data/mockData.ts
git commit -m "feat: add health breakdown helpers to mockData"
```

---

### Task 2: Create the HealthBreakdown component

**Files:**
- Create: `src/components/ui/HealthBreakdown.tsx`

**Step 1: Write the component**

Create `src/components/ui/HealthBreakdown.tsx` with this exact content:

```tsx
// src/components/ui/HealthBreakdown.tsx
import { motion } from 'framer-motion'
import { HealthBreakdownData } from '../../data/mockData'

function scoreColor(score: number) {
  if (score >= 75) return 'bg-success'
  if (score >= 50) return 'bg-warning'
  return 'bg-danger'
}

function textColor(score: number) {
  if (score >= 75) return 'text-success'
  if (score >= 50) return 'text-warning'
  return 'text-danger'
}

export function HealthBreakdown(props: HealthBreakdownData) {
  const { jiraScore, githubScore, onTimePct, blockedTasks, prMergeRate, avgVelocity, stalePRs } = props

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="mt-3 space-y-4 border-t border-border pt-3">

        {/* Jira Performance */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-secondary text-xs font-medium">Jira Performance</span>
            <span className={`text-xs font-bold ${textColor(jiraScore)}`}>{jiraScore} / 100</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${jiraScore}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full ${scoreColor(jiraScore)}`}
            />
          </div>
          <div className="space-y-1 pl-1">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>On-time completion</span><span>{onTimePct}%</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Blocked / At-risk tasks</span><span>{blockedTasks}</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Sprint completion</span><span>{onTimePct}%</span>
            </div>
          </div>
        </div>

        {/* GitHub Activity */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-secondary text-xs font-medium">GitHub Activity</span>
            <span className={`text-xs font-bold ${textColor(githubScore)}`}>{githubScore} / 100</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${githubScore}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
              className={`h-full rounded-full ${scoreColor(githubScore)}`}
            />
          </div>
          <div className="space-y-1 pl-1">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>PR merge rate</span><span>{prMergeRate}%</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Stale PRs</span><span>{stalePRs}</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Avg velocity</span><span>{avgVelocity} pt/day</span>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/ui/HealthBreakdown.tsx
git commit -m "feat: add HealthBreakdown component"
```

---

### Task 3: Update DeveloperCard with expandable detail panel

**Files:**
- Modify: `src/components/ui/DeveloperCard.tsx`

**Step 1: Replace the entire file content**

The current card only shows 3 focus tasks. Add `expanded` + `onToggle` props and an `AnimatePresence` panel that shows all tasks, PR details, and risk signals.

Write this exact content to `src/components/ui/DeveloperCard.tsx`:

```tsx
// src/components/ui/DeveloperCard.tsx
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitPullRequest, CheckCircle, AlertCircle, Clock, ChevronDown,
  TrendingUp, TrendingDown, Minus, CircleDot
} from 'lucide-react'
import { Developer, Task } from '../../data/mockData'
import { RiskBadge } from './RiskBadge'

const borderColor: Record<string, string> = {
  healthy: 'border-l-success',
  watch: 'border-l-warning',
  'at-risk': 'border-l-danger',
  critical: 'border-l-danger',
}

function TaskStatusIcon({ status }: { status: Task['status'] }) {
  if (status === 'blocked') return <AlertCircle size={12} className="text-danger mt-0.5 flex-shrink-0" />
  if (status === 'in-progress') return <Clock size={12} className="text-warning mt-0.5 flex-shrink-0" />
  if (status === 'done') return <CheckCircle size={12} className="text-success mt-0.5 flex-shrink-0" />
  return <CircleDot size={12} className="text-text-secondary mt-0.5 flex-shrink-0" />
}

function TaskStatusBadge({ status }: { status: Task['status'] }) {
  const map: Record<Task['status'], string> = {
    blocked: 'bg-danger/10 text-danger',
    'in-progress': 'bg-warning/10 text-warning',
    done: 'bg-success/10 text-success',
    todo: 'bg-border text-text-secondary',
  }
  return <span className={`text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 ${map[status]}`}>{status}</span>
}

function PRStatusBadge({ status }: { status: 'open' | 'approved' | 'changes-requested' }) {
  const map = {
    open: 'bg-accent/10 text-accent',
    approved: 'bg-success/10 text-success',
    'changes-requested': 'bg-danger/10 text-danger',
  }
  return <span className={`text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 ${map[status]}`}>{status}</span>
}

function VelocityIcon({ trend }: { trend: Developer['velocityTrend'] }) {
  if (trend === 'up') return <TrendingUp size={12} className="text-success flex-shrink-0" />
  if (trend === 'down') return <TrendingDown size={12} className="text-danger flex-shrink-0" />
  return <Minus size={12} className="text-text-secondary flex-shrink-0" />
}

interface DeveloperCardProps {
  dev: Developer
  delay?: number
  expanded?: boolean
  onToggle?: () => void
}

export function DeveloperCard({ dev, delay = 0, expanded = false, onToggle }: DeveloperCardProps) {
  const focusTasks = dev.tasks.filter(t => t.status !== 'done').slice(0, 3)
  const hasBlocker = dev.tasks.some(t => t.status === 'blocked')
  const isExpandable = !!onToggle

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`bg-card border border-border border-l-4 ${borderColor[dev.riskLevel]} rounded-xl overflow-hidden card-glow`}
    >
      {/* ── Summary section (always visible) ── */}
      <div className="p-5">

        {/* Header row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <span className="text-accent text-sm font-bold">{dev.initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-semibold text-sm truncate">{dev.name}</p>
            <p className="text-text-secondary text-xs truncate">{dev.role}</p>
          </div>
          <RiskBadge level={dev.riskLevel} />
          {isExpandable && (
            <button
              onClick={onToggle}
              className="ml-1 text-text-secondary hover:text-text-primary transition-colors"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
            >
              <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} />
              </motion.div>
            </button>
          )}
        </div>

        {/* Today's focus */}
        <div className="mb-4">
          <p className="text-text-secondary text-xs font-medium mb-2">Today's focus</p>
          <div className="space-y-1.5">
            {focusTasks.map(task => (
              <div key={task.id} className="flex items-start gap-2">
                <TaskStatusIcon status={task.status} />
                <span className="text-text-primary text-xs leading-relaxed flex-1">{task.title}</span>
                <span className="text-text-secondary text-xs flex-shrink-0">{task.points}pt</span>
              </div>
            ))}
          </div>
        </div>

        {/* PR status */}
        {dev.prStatus && (
          <div className="border-t border-border pt-3 mb-3">
            <div className="flex items-center gap-2">
              <GitPullRequest size={13} className="text-accent flex-shrink-0" />
              <span className="text-text-secondary text-xs">
                {dev.prStatus.waitingHours >= 12
                  ? `PR #${dev.prStatus.number} waiting ${dev.prStatus.waitingHours}h — nudged ${dev.prStatus.reviewer}`
                  : `PR #${dev.prStatus.number} · ${dev.prStatus.status}`}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`flex items-center gap-2 text-xs ${hasBlocker ? 'text-danger' : 'text-success'}`}>
          {hasBlocker
            ? <><AlertCircle size={12} /><span>Blocked task needs attention</span></>
            : <><CheckCircle size={12} /><span>You're on track — keep it up</span></>
          }
        </div>
      </div>

      {/* ── Expanded detail section ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-border mx-5" />
            <div className="p-5 space-y-5">

              {/* All Tasks */}
              <div>
                <p className="text-text-secondary text-xs font-medium mb-2">All Tasks</p>
                <div className="space-y-2">
                  {dev.tasks.map(task => (
                    <div key={task.id} className="flex items-start gap-2">
                      <TaskStatusIcon status={task.status} />
                      <span className="text-text-primary text-xs leading-relaxed flex-1">{task.title}</span>
                      <span className="text-text-secondary text-xs flex-shrink-0">{task.points}pt</span>
                      <TaskStatusBadge status={task.status} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Open PR */}
              {dev.prStatus && (
                <div>
                  <p className="text-text-secondary text-xs font-medium mb-2">Open PR</p>
                  <div className="bg-bg rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <GitPullRequest size={13} className="text-accent flex-shrink-0" />
                      <span className="text-text-primary text-xs font-medium">#{dev.prStatus.number}</span>
                      <PRStatusBadge status={dev.prStatus.status} />
                    </div>
                    <p className="text-text-secondary text-xs">{dev.prStatus.title}</p>
                    <div className="flex gap-4 text-xs text-text-secondary">
                      <span>Waiting <span className="text-text-primary">{dev.prStatus.waitingHours}h</span></span>
                      <span>Reviewer <span className="text-text-primary">{dev.prStatus.reviewer}</span></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Signals */}
              <div>
                <p className="text-text-secondary text-xs font-medium mb-2">Risk Signals</p>
                <div className="bg-bg rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <RiskBadge level={dev.riskLevel} />
                    <span className="text-text-secondary text-xs">{dev.riskSignal}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <VelocityIcon trend={dev.velocityTrend} />
                      <span>{dev.velocity} pt/day</span>
                    </span>
                    <span>Commits: <span className="text-text-primary">{dev.commitPattern}</span></span>
                    <span>Last active: <span className="text-text-primary">{dev.lastActive}</span></span>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/ui/DeveloperCard.tsx
git commit -m "feat: add expandable detail panel to DeveloperCard"
```

---

### Task 4: Rewrite ExecutiveDashboard with drill-down navigation

**Files:**
- Modify: `src/pages/ExecutiveDashboard.tsx`

**Step 1: Replace the entire file content**

This rewrite adds:
- `DrillState` local state — drives which grid is shown
- Breadcrumb that appears at division/team levels, each segment clickable
- `AnimatePresence` grid transition (slide left/right based on drill direction)
- DivisionCards and TeamCards now have a clickable mini HealthRing that toggles the `HealthBreakdown` panel
- The main HealthRing card has a "View breakdown" toggle link
- DeveloperCards support expand/collapse via `expandedDevId` state
- Division Head starts at their division; Team Lead starts at their team

Write this exact content to `src/pages/ExecutiveDashboard.tsx`:

```tsx
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
  divisions, teams, companyHealthScore, companyStalePRs, companyAtRiskTasks,
  sprint, getDevelopersByTeam, getTeamsByDivision, getDivisionById, getTeamById,
  getHealthBreakdown, getAvgVelocityForTeam, getAvgVelocityForDivision,
} from '../data/mockData'

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

// ── Sub-components ────────────────────────────────────────────────────────────
function DivisionCard({
  div, delay, showBreakdown, onToggleBreakdown, onClick,
}: {
  div: typeof divisions[0]
  delay: number
  showBreakdown: boolean
  onToggleBreakdown: (e: React.MouseEvent) => void
  onClick: () => void
}) {
  const divTeams = getTeamsByDivision(div.id)
  const breakdown = getHealthBreakdown(div, getAvgVelocityForDivision(div.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`bg-card border border-border border-l-4 ${healthBorder(div.healthScore)} rounded-xl p-5 cursor-pointer card-glow`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-text-primary font-semibold">{div.name}</p>
          <p className="text-text-secondary text-xs mt-0.5">{divTeams.length} teams</p>
        </div>
        <div onClick={onToggleBreakdown} className="cursor-pointer">
          <HealthRing score={div.healthScore} size={64} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><p className="text-text-secondary text-xs">Stale PRs</p><p className="text-warning font-semibold">{div.stalePRs}</p></div>
        <div><p className="text-text-secondary text-xs">At Risk</p><p className="text-danger font-semibold">{div.atRiskTasks}</p></div>
        <div><p className="text-text-secondary text-xs">Points</p><p className="text-text-primary font-semibold">{div.completedPoints}/{div.totalPoints}</p></div>
      </div>
      <AnimatePresence>{showBreakdown && <HealthBreakdown {...breakdown} />}</AnimatePresence>
    </motion.div>
  )
}

function TeamCard({
  team, delay, showBreakdown, onToggleBreakdown, onClick,
}: {
  team: typeof teams[0]
  delay: number
  showBreakdown: boolean
  onToggleBreakdown: (e: React.MouseEvent) => void
  onClick: () => void
}) {
  const devs = getDevelopersByTeam(team.id)
  const breakdown = getHealthBreakdown(team, getAvgVelocityForTeam(team.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`bg-card border border-border border-l-4 ${healthBorder(team.healthScore)} rounded-xl p-5 cursor-pointer card-glow`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-text-primary font-semibold">{team.name}</p>
          <p className="text-text-secondary text-xs mt-0.5">{devs.length} developers</p>
        </div>
        <div onClick={onToggleBreakdown} className="cursor-pointer">
          <HealthRing score={team.healthScore} size={56} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><p className="text-text-secondary text-xs">Stale PRs</p><p className="text-warning font-semibold">{team.stalePRs}</p></div>
        <div><p className="text-text-secondary text-xs">At Risk</p><p className="text-danger font-semibold">{team.atRiskTasks}</p></div>
        <div><p className="text-text-secondary text-xs">Points</p><p className="text-text-primary font-semibold">{team.completedPoints}/{team.totalPoints}</p></div>
      </div>
      <AnimatePresence>{showBreakdown && <HealthBreakdown {...breakdown} />}</AnimatePresence>
    </motion.div>
  )
}

// ── Grid slide animation variants ─────────────────────────────────────────────
const gridVariants = {
  enter: (dir: 'forward' | 'back') => ({ opacity: 0, x: dir === 'forward' ? 24 : -24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: 'forward' | 'back') => ({ opacity: 0, x: dir === 'forward' ? -24 : 24 }),
}

// ── Main component ────────────────────────────────────────────────────────────
export function ExecutiveDashboard() {
  const { activeUser, visibleDivisions, visibleTeams, visibleDevelopers } = useUser()

  // ── Drill state ──
  const [drill, setDrill] = useState<DrillState>(() => {
    if (activeUser.role === 'divisionHead') return { level: 'division', divisionId: activeUser.divisionId!, teamId: null }
    if (activeUser.role === 'teamLead') return { level: 'team', divisionId: activeUser.divisionId!, teamId: activeUser.teamId! }
    return { level: 'top', divisionId: null, teamId: null }
  })
  const [drillDir, setDrillDir] = useState<'forward' | 'back'>('forward')
  const [expandedDevId, setExpandedDevId] = useState<string | null>(null)
  const [showMainBreakdown, setShowMainBreakdown] = useState(false)
  const [cardBreakdownId, setCardBreakdownId] = useState<string | null>(null)

  // ── Navigation helpers ──
  function drillIntoDiv(divId: string) {
    setDrillDir('forward')
    setDrill({ level: 'division', divisionId: divId, teamId: null })
    setExpandedDevId(null)
    setCardBreakdownId(null)
  }

  function drillIntoTeam(divId: string, teamId: string) {
    setDrillDir('forward')
    setDrill({ level: 'team', divisionId: divId, teamId })
    setExpandedDevId(null)
    setCardBreakdownId(null)
  }

  function drillBackTo(level: DrillLevel, divisionId: string | null = null) {
    setDrillDir('back')
    setDrill({ level, divisionId, teamId: null })
    setExpandedDevId(null)
    setCardBreakdownId(null)
  }

  function toggleCardBreakdown(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    setCardBreakdownId(prev => (prev === id ? null : id))
  }

  function toggleDevExpand(devId: string) {
    setExpandedDevId(prev => (prev === devId ? null : devId))
  }

  // ── Display health score (for main ring) ──
  const displayHealthScore =
    drill.level === 'team' && drill.teamId ? (getTeamById(drill.teamId)?.healthScore ?? 0)
    : drill.level === 'division' && drill.divisionId ? (getDivisionById(drill.divisionId)?.healthScore ?? 0)
    : activeUser.role === 'cto' ? companyHealthScore
    : activeUser.role === 'divisionHead' ? (visibleDivisions[0]?.healthScore ?? 0)
    : activeUser.role === 'teamLead' ? (visibleTeams[0]?.healthScore ?? 0)
    : 0

  const displayStalePRs =
    activeUser.role === 'cto' ? companyStalePRs
    : visibleTeams.reduce((s, t) => s + t.stalePRs, 0) || visibleDivisions.reduce((s, d) => s + d.stalePRs, 0)

  const displayAtRisk =
    activeUser.role === 'cto' ? companyAtRiskTasks
    : visibleTeams.reduce((s, t) => s + t.atRiskTasks, 0) || visibleDivisions.reduce((s, d) => s + d.atRiskTasks, 0)

  // ── Main breakdown entity ──
  const mainBreakdownEntity =
    drill.level === 'team' && drill.teamId ? getTeamById(drill.teamId)
    : drill.level === 'division' && drill.divisionId ? getDivisionById(drill.divisionId)
    : null

  const mainBreakdownAvgVel =
    drill.level === 'team' && drill.teamId ? getAvgVelocityForTeam(drill.teamId)
    : drill.level === 'division' && drill.divisionId ? getAvgVelocityForDivision(drill.divisionId)
    : visibleDevelopers.length
      ? Math.round((visibleDevelopers.reduce((s, d) => s + d.velocity, 0) / visibleDevelopers.length) * 10) / 10
      : 0

  const mainBreakdownData = mainBreakdownEntity
    ? getHealthBreakdown(mainBreakdownEntity, mainBreakdownAvgVel)
    : null

  // ── Current division/team names for breadcrumb ──
  const currentDivision = drill.divisionId ? getDivisionById(drill.divisionId) : null
  const currentTeam = drill.teamId ? getTeamById(drill.teamId) : null

  // ── Grid content by drill level ──
  const gridKey = `${drill.level}-${drill.divisionId ?? ''}-${drill.teamId ?? ''}`

  const teamsForDivision = drill.divisionId ? getTeamsByDivision(drill.divisionId) : []
  const devsForTeam = drill.teamId ? getDevelopersByTeam(drill.teamId) : visibleDevelopers

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Executive Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          {sprint.name} · {sprint.completedPoints}/{sprint.totalPoints} points completed
        </p>
      </div>

      {/* Health + Metrics */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center min-w-[200px]"
        >
          <HealthRing score={displayHealthScore} size={140} />
          <p className="text-text-secondary text-sm mt-3 text-center">Team Health Score</p>
          {mainBreakdownData && (
            <button
              onClick={() => setShowMainBreakdown(p => !p)}
              className="mt-2 text-accent text-xs hover:underline"
            >
              {showMainBreakdown ? 'Hide breakdown' : 'View breakdown'}
            </button>
          )}
          <AnimatePresence>
            {showMainBreakdown && mainBreakdownData && (
              <div className="w-full">
                <HealthBreakdown {...mainBreakdownData} />
              </div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard label="Stale PRs" value={displayStalePRs} color="warning" icon={<GitPullRequest size={16} />} trend="up" trendLabel="vs last sprint" delay={0.1} />
          <MetricCard label="At-Risk Tasks" value={displayAtRisk} color="danger" icon={<AlertTriangle size={16} />} trend="up" trendLabel={`${Math.round((displayAtRisk / sprint.totalPoints) * 100)}% of sprint`} delay={0.15} />
          <MetricCard label="Sprint Completion" value={sprint.completedPoints} unit={`/${sprint.totalPoints}`} color="default" icon={<Target size={16} />} trend="stable" trendLabel="points done" delay={0.2} />
          <MetricCard label="Team Velocity" value={Math.round(visibleDevelopers.reduce((s, d) => s + d.velocity, 0) * 10) / 10} unit=" pts/day" color="success" icon={<Zap size={16} />} trend="stable" trendLabel="avg across team" delay={0.25} />
        </div>
      </div>

      {/* Developer solo view */}
      {activeUser.role === 'developer' && visibleDevelopers[0] && (
        <div className="max-w-md">
          <h2 className="text-text-primary font-semibold mb-4">Your Summary</h2>
          <DeveloperCard dev={visibleDevelopers[0]} />
        </div>
      )}

      {/* Drill-down section for cto / divisionHead / teamLead */}
      {activeUser.role !== 'developer' && (
        <div>
          {/* Breadcrumb */}
          {drill.level !== 'top' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 text-sm mb-5 flex-wrap"
            >
              <button
                onClick={() => drillBackTo('top')}
                className="text-text-secondary hover:text-text-primary transition-colors"
              >
                NovaTech
              </button>
              {currentDivision && (
                <>
                  <ChevronRight size={14} className="text-border" />
                  {drill.level === 'division' ? (
                    <span className="text-text-primary font-medium">{currentDivision.name}</span>
                  ) : (
                    <button
                      onClick={() => drillBackTo('division', drill.divisionId)}
                      className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {currentDivision.name}
                    </button>
                  )}
                </>
              )}
              {currentTeam && drill.level === 'team' && (
                <>
                  <ChevronRight size={14} className="text-border" />
                  <span className="text-text-primary font-medium">{currentTeam.name}</span>
                </>
              )}
            </motion.div>
          )}

          {/* Section title */}
          <h2 className="text-text-primary font-semibold mb-4">
            {drill.level === 'top' && 'Divisions'}
            {drill.level === 'division' && `Teams in ${currentDivision?.name}`}
            {drill.level === 'team' && `Developers in ${currentTeam?.name}`}
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
              {/* Top level: Divisions */}
              {drill.level === 'top' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleDivisions.map((div, i) => (
                    <DivisionCard
                      key={div.id}
                      div={div}
                      delay={i * 0.05}
                      showBreakdown={cardBreakdownId === div.id}
                      onToggleBreakdown={e => toggleCardBreakdown(e, div.id)}
                      onClick={() => drillIntoDiv(div.id)}
                    />
                  ))}
                </div>
              )}

              {/* Division level: Teams */}
              {drill.level === 'division' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {teamsForDivision.map((team, i) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      delay={i * 0.05}
                      showBreakdown={cardBreakdownId === team.id}
                      onToggleBreakdown={e => toggleCardBreakdown(e, team.id)}
                      onClick={() => drillIntoTeam(drill.divisionId!, team.id)}
                    />
                  ))}
                </div>
              )}

              {/* Team level: Developers */}
              {drill.level === 'team' && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {devsForTeam.map((dev, i) => (
                    <DeveloperCard
                      key={dev.id}
                      dev={dev}
                      delay={i * 0.05}
                      expanded={expandedDevId === dev.id}
                      onToggle={() => toggleDevExpand(dev.id)}
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/pages/ExecutiveDashboard.tsx
git commit -m "feat: drill-down navigation and health breakdown on Executive Dashboard"
```

---

### Task 5: Rewrite DeveloperBriefing with team groups, filters, and sorting

**Files:**
- Modify: `src/pages/DeveloperBriefing.tsx`

**Step 1: Replace the entire file content**

This rewrite adds:
- Team-grouped collapsible sections (default expanded)
- Sticky filter bar: team dropdown + risk level pills + sort dropdown
- Filters combined with AND logic; empty = show all
- Sort within each team: risk (critical→at-risk→watch→healthy) or velocity (ascending)
- Empty state when no developers match

Write this exact content to `src/pages/DeveloperBriefing.tsx`:

```tsx
// src/pages/DeveloperBriefing.tsx
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ChevronDown, X } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { DeveloperCard } from '../components/ui/DeveloperCard'
import { HealthRing } from '../components/ui/HealthRing'
import { Developer, RiskLevel, getTeamById, users } from '../data/mockData'

const RISK_LEVELS: RiskLevel[] = ['critical', 'at-risk', 'watch', 'healthy']
const RISK_ORDER: Record<RiskLevel, number> = { critical: 0, 'at-risk': 1, watch: 2, healthy: 3 }

const riskPillColor: Record<RiskLevel, string> = {
  critical: 'border-danger text-danger bg-danger/10',
  'at-risk': 'border-warning text-warning bg-warning/10',
  watch: 'border-accent text-accent bg-accent/10',
  healthy: 'border-success text-success bg-success/10',
}

interface BriefingFilters {
  teamIds: string[]
  riskLevels: RiskLevel[]
  sort: 'risk' | 'velocity' | 'none'
}

export function DeveloperBriefing() {
  const { activeUser, visibleDevelopers } = useUser()
  const isSoloView = activeUser.role === 'developer'

  const [filters, setFilters] = useState<BriefingFilters>({ teamIds: [], riskLevels: [], sort: 'none' })
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set())
  const [expandedDevId, setExpandedDevId] = useState<string | null>(null)

  // Unique teams from visibleDevelopers, preserving order of first appearance
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

  // Apply filters + sort, grouped by team
  const filteredDevsByTeam = useMemo(() => {
    const result: Record<string, Developer[]> = {}
    for (const team of visibleTeamsList) {
      // Team filter
      if (filters.teamIds.length > 0 && !filters.teamIds.includes(team.id)) continue

      let devs = visibleDevelopers.filter(d => d.teamId === team.id)

      // Risk filter
      if (filters.riskLevels.length > 0) {
        devs = devs.filter(d => filters.riskLevels.includes(d.riskLevel))
      }

      // Sort
      if (filters.sort === 'risk') {
        devs = [...devs].sort((a, b) => RISK_ORDER[a.riskLevel] - RISK_ORDER[b.riskLevel])
      } else if (filters.sort === 'velocity') {
        devs = [...devs].sort((a, b) => a.velocity - b.velocity)
      }

      if (devs.length > 0) result[team.id] = devs
    }
    return result
  }, [visibleTeamsList, visibleDevelopers, filters])

  const totalVisible = Object.values(filteredDevsByTeam).reduce((s, devs) => s + devs.length, 0)
  const hasActiveFilters = filters.teamIds.length > 0 || filters.riskLevels.length > 0

  function toggleRiskLevel(level: RiskLevel) {
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

  function toggleDevExpand(devId: string) {
    setExpandedDevId(prev => (prev === devId ? null : devId))
  }

  // Solo developer view (unchanged)
  if (isSoloView && visibleDevelopers[0]) {
    return (
      <div>
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-text-primary">Developer Daily Briefing</h1>
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-2 text-text-secondary text-sm mb-8"
        >
          <Sparkles size={14} className="text-accent" />
          <span>Your AI-powered focus for today</span>
        </motion.div>
        <div className="max-w-lg mx-auto">
          <DeveloperCard dev={visibleDevelopers[0]} />
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="mt-4 bg-accent/10 border border-accent/20 rounded-xl p-4"
          >
            <p className="text-accent text-sm font-medium mb-1">Here's what will help you finish today smoothly</p>
            <p className="text-text-secondary text-xs leading-relaxed">
              Focus on your top in-progress task first. You have {visibleDevelopers[0].tasks.filter(t => t.status === 'blocked').length} blocked task(s) that may need a sync with your team lead.
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-text-primary">Developer Daily Briefing</h1>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex items-center gap-2 text-text-secondary text-sm mb-6"
      >
        <Sparkles size={14} className="text-accent" />
        <span>Your AI-powered focus for today</span>
      </motion.div>

      {/* Sticky filter bar */}
      <div className="sticky top-14 z-10 bg-bg border-b border-border py-3 flex gap-3 items-center flex-wrap mb-6 -mx-6 px-6">
        {/* Team dropdown */}
        <select
          value={filters.teamIds[0] ?? ''}
          onChange={e => setFilters(f => ({ ...f, teamIds: e.target.value ? [e.target.value] : [] }))}
          className="bg-card border border-border text-text-primary text-sm rounded-lg px-3 py-1.5 cursor-pointer"
        >
          <option value="">All Teams</option>
          {visibleTeamsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>

        {/* Risk level pills */}
        <div className="flex gap-1.5 flex-wrap">
          {RISK_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => toggleRiskLevel(level)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                filters.riskLevels.includes(level)
                  ? riskPillColor[level]
                  : 'border-border text-text-secondary hover:border-text-secondary'
              }`}
            >
              {level}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <select
          value={filters.sort}
          onChange={e => setFilters(f => ({ ...f, sort: e.target.value as BriefingFilters['sort'] }))}
          className="bg-card border border-border text-text-primary text-sm rounded-lg px-3 py-1.5 cursor-pointer"
        >
          <option value="none">Sort: Default</option>
          <option value="risk">Risk ↓</option>
          <option value="velocity">Velocity ↑</option>
        </select>

        {/* Clear */}
        {hasActiveFilters && (
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
          .filter(team => filteredDevsByTeam[team.id])
          .map(team => {
            const teamDevs = filteredDevsByTeam[team.id]
            const isCollapsed = collapsedTeams.has(team.id)
            const leadName = users.find(u => u.id === team.leadId)?.name ?? '—'

            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Team section header */}
                <div
                  className="flex items-center justify-between cursor-pointer mb-4 pb-3 border-b border-border"
                  onClick={() => toggleTeamCollapse(team.id)}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-text-primary font-semibold">{team.name}</span>
                    <span className="text-text-secondary text-xs">Lead: {leadName}</span>
                    <HealthRing score={team.healthScore} size={32} />
                    <span className="text-text-secondary text-xs">{teamDevs.length} dev{teamDevs.length !== 1 ? 's' : ''}</span>
                  </div>
                  <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={16} className="text-text-secondary" />
                  </motion.div>
                </div>

                {/* Collapsible developer grid */}
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {teamDevs.map((dev, i) => (
                          <DeveloperCard
                            key={dev.id}
                            dev={dev}
                            delay={i * 0.04}
                            expanded={expandedDevId === dev.id}
                            onToggle={() => toggleDevExpand(dev.id)}
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
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/pages/DeveloperBriefing.tsx
git commit -m "feat: team-grouped developer briefing with filter and sort bar"
```

---

### Task 6: Build verify and push

**Files:** None modified — verification only.

**Step 1: Run full production build**

Run: `npm run build`
Expected: Build completes with no errors. Output in `dist/`.

**Step 2: If build fails — fix TypeScript/import errors first**

Common issues to check:
- Any unused imports (TypeScript strict mode may warn)
- Missing exports from mockData.ts
- Wrong import paths

**Step 3: Push to trigger GitHub Actions deploy**

```bash
git push origin master
```

Expected: GitHub Actions workflow starts at `https://github.com/roee030/devpulse-ai/actions`. Deploys to `https://roee030.github.io/devpulse-ai/` within ~2 minutes.

**Step 4: Confirm deployment**

Open `https://roee030.github.io/devpulse-ai/` and verify:
- CTO view: 3 division cards → click one → 2-3 team cards → click one → developer cards with expand toggle
- Health ring → "View breakdown" link shows Jira/GitHub bars
- Click mini HealthRing on a division/team card → inline breakdown appears
- Developer Briefing: team sections with collapse toggle, filter bar (risk pills, team dropdown, sort)
- Filters narrow visible developers; empty state shows when no matches

---

## Summary of changes

| File | Type | What changes |
|------|------|-------------|
| `src/data/mockData.ts` | Modify | Add `HealthBreakdownData` interface + `getHealthBreakdown`, `getAvgVelocityForTeam`, `getAvgVelocityForDivision` helpers |
| `src/components/ui/HealthBreakdown.tsx` | Create | Jira + GitHub score bars with animated progress fills |
| `src/components/ui/DeveloperCard.tsx` | Modify | Add `expanded`/`onToggle` props; AnimatePresence panel with all tasks, PR details, risk signals |
| `src/pages/ExecutiveDashboard.tsx` | Modify | Drill-down state, breadcrumb, AnimatePresence grid transitions, HealthBreakdown integration |
| `src/pages/DeveloperBriefing.tsx` | Modify | Team-grouped collapsible sections, sticky filter bar, DeveloperCard expand support |
