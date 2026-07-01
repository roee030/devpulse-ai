// src/lib/metrics.ts
// Pure functions that derive all dashboard metrics from raw Unified.to data.
// No side effects — safe to call in useMemo or state setters.
// Uses structural (duck-typed) interfaces to avoid circular imports with UnifiedDataContext.

import type { Team, Division, BurndownDay, QuarterSummary } from '../data/mockData'

// ── Minimal structural interfaces (avoid circular deps) ───────────────────────

interface TaskLike {
  id:          string
  title:       string
  status:      string
  points:      number
  isBlocked:   boolean
  dueAt:       Date | null
  createdAt:   Date
  epicId:      string | null
  prs:         { id: string }[]
  assigneeDev: { teamId: string } | null
}

interface PRLike {
  id:           string
  status:       string
  waitingHours: number
}

// ── Sprint ────────────────────────────────────────────────────────────────────

export interface SprintSummary {
  name:            string
  startDate:       string
  endDate:         string
  totalPoints:     number
  completedPoints: number
  projectedPoints: number
  burndownData:    BurndownDay[]
  topBlockers:     { id: string; description: string; tasksDelayed: number }[]
}

export function computeSprint(
  tasks:    TaskLike[],
  fallback: SprintSummary,
): SprintSummary {
  if (tasks.length === 0) return fallback

  const totalPoints     = Math.max(1, tasks.reduce((s, t) => s + (t.points || 1), 0))
  const completedPoints = tasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.points || 1), 0)
  const blockedTasks    = tasks.filter(t => t.isBlocked)

  const now        = Date.now()
  const dueTimes   = tasks.filter(t => t.dueAt).map(t => t.dueAt!.getTime())
  const sprintEndMs   = dueTimes.length ? Math.max(...dueTimes) : now + 7 * 86_400_000
  const sprintStartMs = sprintEndMs - 14 * 86_400_000
  const dayElapsed    = Math.max(0, Math.min(14, Math.floor((now - sprintStartMs) / 86_400_000)))

  const rate            = dayElapsed > 0 ? completedPoints / dayElapsed : completedPoints / 14
  const projectedPoints = Math.min(totalPoints, Math.round(rate * 14))

  const burndownData: BurndownDay[] = Array.from({ length: 15 }, (_, day) => ({
    day,
    ideal:     Math.round(totalPoints * (1 - day / 14)),
    actual:    day <= dayElapsed ? Math.round(Math.max(0, totalPoints - rate * day)) : null,
    predicted: day >  dayElapsed ? Math.round(Math.max(0, totalPoints - rate * day)) : null,
  }))

  const topBlockers = blockedTasks.slice(0, 3).map(t => ({
    id:           t.id,
    description:  t.title.slice(0, 80),
    tasksDelayed: 1,
  }))

  const toDateStr = (ms: number) => new Date(ms).toISOString().slice(0, 10)

  return {
    name:            `Current Sprint — ${tasks.length} tasks`,
    startDate:       toDateStr(sprintStartMs),
    endDate:         toDateStr(sprintEndMs),
    totalPoints,
    completedPoints,
    projectedPoints,
    burndownData,
    topBlockers: topBlockers.length > 0 ? topBlockers : fallback.topBlockers,
  }
}

// ── Health score ──────────────────────────────────────────────────────────────

export function computeHealthScore(tasks: TaskLike[], prs: PRLike[]): number {
  if (tasks.length === 0) return 50

  const total      = tasks.length
  const done       = tasks.filter(t => t.status === 'done').length
  const blocked    = tasks.filter(t => t.isBlocked).length
  const inProgress = tasks.filter(t => t.status === 'in-progress').length
  const stalePRs   = prs.filter(
    p => (p.status === 'open' || p.status === 'changes-requested') && p.waitingHours > 24,
  ).length

  const base            = 50
  const completionBonus = Math.round(30 * (done / total))
  const activityBonus   = Math.min(10, Math.round(10 * (inProgress / total)))
  const blockerPenalty  = Math.min(25, blocked * 5)
  const stalePenalty    = Math.min(15, stalePRs * 3)

  return Math.max(0, Math.min(100, base + completionBonus + activityBonus - blockerPenalty - stalePenalty))
}

// ── Team / Division metrics ───────────────────────────────────────────────────

type TeamMetrics = Pick<Team, 'healthScore' | 'stalePRs' | 'atRiskTasks' | 'completedPoints' | 'totalPoints'>

function computeTeamMetrics(teamId: string, allTasks: TaskLike[], allPRs: PRLike[]): TeamMetrics {
  const tasks      = allTasks.filter(t => t.assigneeDev?.teamId === teamId)
  const linkedIds  = new Set(tasks.flatMap(t => t.prs.map(p => p.id)))
  const prs        = allPRs.filter(p => linkedIds.has(p.id))
  const done       = tasks.filter(t => t.status === 'done')
  const blocked    = tasks.filter(t => t.isBlocked)
  const stalePRs   = prs.filter(
    p => (p.status === 'open' || p.status === 'changes-requested') && p.waitingHours > 24,
  ).length

  return {
    healthScore:     tasks.length > 0 ? computeHealthScore(tasks, prs) : 0,
    stalePRs,
    atRiskTasks:     blocked.length,
    completedPoints: done.reduce((s, t) => s + (t.points || 1), 0),
    totalPoints:     tasks.reduce((s, t) => s + (t.points || 1), 0),
  }
}

export function computeTeams(baseTeams: Team[], tasks: TaskLike[], prs: PRLike[]): Team[] {
  if (tasks.length === 0) return baseTeams
  return baseTeams.map(t => ({ ...t, ...computeTeamMetrics(t.id, tasks, prs) }))
}

export function computeDivisions(baseDivisions: Division[], updatedTeams: Team[]): Division[] {
  if (updatedTeams.every(t => t.totalPoints === 0)) return baseDivisions
  return baseDivisions.map(div => {
    const divTeams  = updatedTeams.filter(t => t.divisionId === div.id)
    if (divTeams.length === 0) return div
    const totalPts  = divTeams.reduce((s, t) => s + t.totalPoints, 0)
    if (totalPts === 0) return div
    return {
      ...div,
      stalePRs:        divTeams.reduce((s, t) => s + t.stalePRs, 0),
      atRiskTasks:     divTeams.reduce((s, t) => s + t.atRiskTasks, 0),
      completedPoints: divTeams.reduce((s, t) => s + t.completedPoints, 0),
      totalPoints:     totalPts,
      healthScore:     Math.round(
        divTeams.reduce((s, t) => s + t.healthScore * t.totalPoints, 0) / totalPts,
      ),
    }
  })
}

// ── Annual view ───────────────────────────────────────────────────────────────

export interface MonthlyVelocityPoint {
  month:  string
  actual: number | null
  target: number
}

const MONTHS        = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const QUARTER_MONTHS: number[][] = [[0,1,2],[3,4,5],[6,7,8],[9,10,11]]

export function computeAnnualMetrics(
  tasks:       TaskLike[],
  fallbackQS:  QuarterSummary[],
  fallbackMV:  MonthlyVelocityPoint[],
): { quarterSummaries: QuarterSummary[]; monthlyVelocity: MonthlyVelocityPoint[] } {
  if (tasks.length === 0) return { quarterSummaries: fallbackQS, monthlyVelocity: fallbackMV }

  const now          = new Date()
  const year         = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentQ     = Math.floor(currentMonth / 3)

  const monthBuckets: TaskLike[][] = Array.from({ length: 12 }, () => [])
  for (const t of tasks) {
    const d = t.dueAt ?? t.createdAt
    if (d.getFullYear() === year) monthBuckets[d.getMonth()].push(t)
    else if (d.getFullYear() < year) monthBuckets[0].push(t)
  }
  if (!monthBuckets.some(b => b.length > 0)) {
    monthBuckets[currentMonth] = tasks
  }

  const totalTarget = Math.max(
    60,
    Math.round(tasks.reduce((s, t) => s + (t.points || 1), 0) / Math.max(1, currentMonth + 1)),
  )

  const monthlyVelocity: MonthlyVelocityPoint[] = MONTHS.map((month, i) => {
    const delivered = monthBuckets[i].filter(t => t.status === 'done').reduce((s, t) => s + (t.points || 1), 0)
    return {
      month,
      actual: i <= currentMonth ? (delivered > 0 ? delivered : null) : null,
      target: totalTarget,
    }
  })

  const quarterSummaries: QuarterSummary[] = fallbackQS.map((q, qi) => {
    const qTasks = QUARTER_MONTHS[qi].flatMap(m => monthBuckets[m])
    if (qTasks.length === 0) return q

    const completedPoints = qTasks.filter(t => t.status === 'done').reduce((s, t) => s + (t.points || 1), 0)
    const totalPoints     = qTasks.reduce((s, t) => s + (t.points || 1), 0) || q.totalPoints
    const healthScore     = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : q.healthScore
    const qStatus: QuarterSummary['status'] =
      qi < currentQ ? 'completed' : qi === currentQ ? 'current' : 'upcoming'

    const liveInitiatives = [
      ...qTasks.filter(t => t.status === 'done').slice(0, 2).map(t => ({
        name: t.title.slice(0, 45), status: 'done' as const,
      })),
      ...qTasks.filter(t => t.status === 'in-progress').slice(0, 2).map(t => ({
        name: t.title.slice(0, 45), status: 'on-track' as const,
      })),
      ...qTasks.filter(t => t.isBlocked).slice(0, 1).map(t => ({
        name: t.title.slice(0, 45), status: 'at-risk' as const,
      })),
    ]

    return {
      ...q,
      status:          qStatus,
      deliveredPoints: completedPoints,
      totalPoints,
      healthScore,
      initiatives:     liveInitiatives.length >= 2 ? liveInitiatives : q.initiatives,
    }
  })

  return { quarterSummaries, monthlyVelocity }
}

// ── Epics status map ──────────────────────────────────────────────────────────

export function computeEpicStatusMap(
  tasks: TaskLike[],
): Map<string, 'completed' | 'on-track' | 'at-risk' | 'delayed'> {
  const byEpic = new Map<string, TaskLike[]>()
  for (const t of tasks) {
    if (!t.epicId) continue
    if (!byEpic.has(t.epicId)) byEpic.set(t.epicId, [])
    byEpic.get(t.epicId)!.push(t)
  }

  const result = new Map<string, 'completed' | 'on-track' | 'at-risk' | 'delayed'>()
  for (const [epicId, epicTasks] of byEpic) {
    const total   = epicTasks.length
    const done    = epicTasks.filter(t => t.status === 'done').length
    const blocked = epicTasks.filter(t => t.isBlocked).length
    if (done === total)    result.set(epicId, 'completed')
    else if (blocked >= 2) result.set(epicId, 'delayed')
    else if (blocked >= 1) result.set(epicId, 'at-risk')
    else                   result.set(epicId, 'on-track')
  }
  return result
}
