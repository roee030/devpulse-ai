// src/context/UnifiedDataContext.tsx
// Aggregates data from all Unified.to connections and maps it to DevPulse's
// internal data model. Falls back to mockData when no API key is configured.
import {
  createContext, useContext, useEffect, useState, ReactNode,
} from 'react'
import {
  getUnifiedClient,
  getTasks,
  getPullRequests,
  getTeamMembers,
  detectRole,
  type UniversalTask,
  type UniversalPR,
  type UniversalMember,
} from '../lib/unified'
import {
  developers as mockDevelopers,
  teams as mockTeams,
  divisions as mockDivisions,
  type Developer,
  type Team,
  type Division,
  type Task,
  type PRStatus,
  type RiskLevel,
} from '../data/mockData'

// ── Env ────────────────────────────────────────────────────────────────────────

const JIRA_ID   = import.meta.env.VITE_UNIFIED_JIRA_CONNECTION_ID   ?? ''
const LINEAR_ID = import.meta.env.VITE_UNIFIED_LINEAR_CONNECTION_ID ?? ''
const MONDAY_ID = import.meta.env.VITE_UNIFIED_MONDAY_CONNECTION_ID ?? ''
const GITHUB_ID = import.meta.env.VITE_UNIFIED_GITHUB_CONNECTION_ID ?? ''
// HRIS members come from the same workspace — default to Jira connection ID
const HRIS_ID   = import.meta.env.VITE_UNIFIED_HRIS_CONNECTION_ID ?? JIRA_ID
const API_KEY   = import.meta.env.VITE_UNIFIED_API_KEY            ?? ''

export const IS_UNIFIED_LIVE = !!API_KEY

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ConnectionStatus {
  jira:   boolean
  linear: boolean
  monday: boolean
  github: boolean
  slack:  boolean
  teams:  boolean
}

export interface UnifiedDataState {
  developers:  Developer[]
  teams:       Team[]
  divisions:   Division[]
  allTasks:    UniversalTask[]
  allPRs:      UniversalPR[]
  allMembers:  UniversalMember[]
  connections: ConnectionStatus
  isLoading:   boolean
  error:       string | null
  isLive:      boolean
  lastFetched: Date | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2)
}

function riskFromTasks(tasks: Task[], prStatus: PRStatus | null): RiskLevel {
  const blocked = tasks.filter(t => t.status === 'blocked').length
  if (blocked >= 2 || (prStatus && prStatus.waitingHours > 48)) return 'critical'
  if (blocked >= 1 || (prStatus && prStatus.waitingHours > 24)) return 'at-risk'
  if (prStatus && prStatus.waitingHours > 12) return 'watch'
  return 'healthy'
}

function makeRiskSignal(rl: RiskLevel, tasks: Task[], prStatus: PRStatus | null): string {
  const blocked = tasks.filter(t => t.status === 'blocked').length
  if (rl === 'critical') return `${blocked} blocked task${blocked !== 1 ? 's' : ''}, PR stale ${prStatus?.waitingHours ?? 0}h`
  if (rl === 'at-risk')  return `${blocked} blocked task${blocked !== 1 ? 's' : ''}`
  if (rl === 'watch')    return prStatus ? `PR open ${prStatus.waitingHours}h` : 'Monitor closely'
  return 'On track'
}

function syntheticHeatmap(risk: RiskLevel): number[][] {
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 7 }, (_, d) => {
      if (risk === 'critical') return d < 5 ? 1 : Math.floor(Math.random() * 8 + 3)
      if (risk === 'at-risk')  return d < 5 ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 5 + 2)
      return Math.floor(Math.random() * 7 + 1)
    })
  )
}

function roleTitleLabel(role: string): string {
  if (role === 'cto')          return 'CTO'
  if (role === 'divisionHead') return 'VP Engineering'
  if (role === 'teamLead')     return 'Engineering Manager'
  return 'Software Engineer'
}

// Build Developer[] from Unified member + task + PR data
function buildDevelopers(
  members:  UniversalMember[],
  tasks:    UniversalTask[],
  prs:      UniversalPR[],
  baseTeams: Team[],
): Developer[] {
  return members.map((m, idx) => {
    const myTasks: Task[] = tasks
      .filter(t => t.assigneeId === m.id)
      .map(t => ({ id: t.id, title: t.title, points: t.points, status: t.status }))

    const myPR   = prs.find(p => p.authorId === m.id)
    const prStatus: PRStatus | null = myPR
      ? {
          number:       parseInt(myPR.id.replace(/\D/g, '').slice(0, 6)) || 100 + idx,
          title:        myPR.title,
          waitingHours: myPR.waitingHours,
          reviewer:     '',
          status:       myPR.status,
        }
      : null

    const rl         = riskFromTasks(myTasks, prStatus)
    const teamFallback = baseTeams[idx % Math.max(baseTeams.length, 1)]

    return {
      id:             m.id,
      name:           m.name,
      initials:       initials(m.name),
      role:           m.jobTitle || roleTitleLabel(m.role),
      teamId:         teamFallback?.id      ?? 'team-unknown',
      divisionId:     teamFallback?.divisionId ?? 'div-unknown',
      tasks:          myTasks,
      prStatus,
      riskLevel:      rl,
      riskSignal:     makeRiskSignal(rl, myTasks, prStatus),
      commitPattern:  myPR && myPR.waitingHours > 36 ? '11pm–2am' : '9am–6pm',
      lastActive:     myPR ? `${Math.min(myPR.waitingHours, 48)}h ago` : '—',
      velocityTrend:  myTasks.filter(t => t.status === 'done').length > 2 ? 'up' : 'stable' as const,
      activityHeatmap: syntheticHeatmap(rl),
      velocity:       parseFloat(
        (myTasks.filter(t => t.status === 'done').reduce((s, t) => s + t.points, 0) / 2).toFixed(1),
      ) || 2,
    } satisfies Developer
  })
}

// Sort by role tier: CTO → Division Head → Team Lead → Developer
function sortByRole(devs: Developer[]): Developer[] {
  const order: Record<string, number> = { cto: 0, divisionHead: 1, teamLead: 2, developer: 3 }
  return [...devs].sort((a, b) => {
    const ra = order[detectRole(a.role)] ?? 3
    const rb = order[detectRole(b.role)] ?? 3
    return ra !== rb ? ra - rb : a.name.localeCompare(b.name)
  })
}

// When members aren't available, enrich mock devs with live task/PR data
function enrichMock(devs: Developer[], tasks: UniversalTask[], prs: UniversalPR[]): Developer[] {
  if (tasks.length === 0 && prs.length === 0) return devs
  return devs.map((dev, i) => {
    const myTasks: Task[] = tasks
      .filter((_, ti) => ti % devs.length === i)
      .map(t => ({ id: t.id, title: t.title, points: t.points, status: t.status }))
    const myRawPR = prs.length > 0 ? prs[i % prs.length] : null
    const prStatus: PRStatus | null = myRawPR
      ? { number: 200 + i, title: myRawPR.title, waitingHours: myRawPR.waitingHours, reviewer: '', status: myRawPR.status }
      : dev.prStatus
    if (!myTasks.length && !myRawPR) return dev
    const rl = riskFromTasks(myTasks.length ? myTasks : dev.tasks, prStatus)
    return { ...dev, tasks: myTasks.length ? myTasks : dev.tasks, prStatus, riskLevel: rl }
  })
}

// ── Context ────────────────────────────────────────────────────────────────────

const Ctx = createContext<UnifiedDataState | null>(null)

export function UnifiedDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UnifiedDataState>({
    developers:  mockDevelopers,
    teams:       mockTeams,
    divisions:   mockDivisions,
    allTasks:    [],
    allPRs:      [],
    allMembers:  [],
    connections: { jira: false, linear: false, monday: false, github: false, slack: false, teams: false },
    isLoading:   IS_UNIFIED_LIVE,
    error:       null,
    isLive:      false,
    lastFetched: null,
  })

  useEffect(() => {
    if (!IS_UNIFIED_LIVE) return
    void fetchAll()
  }, [])

  async function fetchAll() {
    const client = getUnifiedClient()

    // Fetch tasks from task platforms + PRs from GitHub + HRIS members in parallel
    const [jiraTasks, linearTasks, mondayTasks, githubPRs, hrisMembers] =
      await Promise.allSettled([
        getTasks(JIRA_ID,   client, 'jira'),
        getTasks(LINEAR_ID, client, 'linear'),
        getTasks(MONDAY_ID, client, 'monday'),
        getPullRequests(GITHUB_ID, client),
        getTeamMembers(HRIS_ID, client),
      ])

    const allTasks = [
      ...(jiraTasks.status   === 'fulfilled' ? jiraTasks.value   : []),
      ...(linearTasks.status === 'fulfilled' ? linearTasks.value : []),
      ...(mondayTasks.status === 'fulfilled' ? mondayTasks.value : []),
    ]
    const allPRs     = githubPRs.status   === 'fulfilled' ? githubPRs.value   : []
    const allMembers = hrisMembers.status  === 'fulfilled' ? hrisMembers.value : []

    const connections: ConnectionStatus = {
      jira:   jiraTasks.status   === 'fulfilled' && jiraTasks.value.length   > 0,
      linear: linearTasks.status === 'fulfilled' && linearTasks.value.length > 0,
      monday: mondayTasks.status === 'fulfilled' && mondayTasks.value.length > 0,
      github: githubPRs.status   === 'fulfilled' && githubPRs.value.length   > 0,
      slack:  false,
      teams:  false,
    }

    // Build developer list: prefer HRIS members, fall back to enriched mock
    const developers = allMembers.length > 0
      ? sortByRole(buildDevelopers(allMembers, allTasks, allPRs, mockTeams))
      : sortByRole(enrichMock(mockDevelopers, allTasks, allPRs))

    setState({
      developers,
      teams:       mockTeams,
      divisions:   mockDivisions,
      allTasks,
      allPRs,
      allMembers,
      connections,
      isLoading:   false,
      error:       null,
      isLive:      allTasks.length > 0 || allPRs.length > 0,
      lastFetched: new Date(),
    })
  }

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

export function useUnifiedData(): UnifiedDataState {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUnifiedData must be used within UnifiedDataProvider')
  return c
}
