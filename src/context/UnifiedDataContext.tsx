// src/context/UnifiedDataContext.tsx
// Aggregates data from all Unified.to connections and cross-links them:
//   Tasks  ↔  PRs   (branch contains task key: feature/PROJ-42-...)
//   Tasks  ↔  Devs  (assignee name ≈ HRIS employee name)
//   Tasks  ↔  Msgs  (Slack message mentions "PROJ-42")
//
// Falls back to mockData when no API key is configured.
import {
  createContext, useContext, useEffect, useState, ReactNode,
} from 'react'
import {
  getUnifiedClient,
  getTasks,
  getPullRequests,
  getTeamMembers,
  getRecentMessages,
  getChannels,
  detectRole,
  type UniversalTask,
  type UniversalPR,
  type UniversalMember,
  type UniversalMessage,
  type UniversalChannel,
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

// ── Env ───────────────────────────────────────────────────────────────────────

const JIRA_ID    = import.meta.env.VITE_UNIFIED_JIRA_CONNECTION_ID   ?? ''
const LINEAR_ID  = import.meta.env.VITE_UNIFIED_LINEAR_CONNECTION_ID ?? ''
const MONDAY_ID  = import.meta.env.VITE_UNIFIED_MONDAY_CONNECTION_ID ?? ''
const GITHUB_ID  = import.meta.env.VITE_UNIFIED_GITHUB_CONNECTION_ID ?? ''
const SLACK_ID   = import.meta.env.VITE_UNIFIED_SLACK_CONNECTION_ID  ?? ''
const TEAMS_ID   = import.meta.env.VITE_UNIFIED_TEAMS_CONNECTION_ID  ?? ''
const HRIS_ID    = import.meta.env.VITE_UNIFIED_HRIS_CONNECTION_ID   ?? JIRA_ID
const API_KEY    = import.meta.env.VITE_UNIFIED_API_KEY               ?? ''

export const IS_UNIFIED_LIVE = !!API_KEY

// ── Types ──────────────────────────────────────────────────────────────────────

export interface LinkedPR {
  id:           string
  number:       number
  title:        string
  sourceBranch: string
  status:       UniversalPR['status']
  authorLogin:  string
  waitingHours: number
  mergedAt:     Date | null
  url:          string
}

export interface LinkedMessage {
  id:        string
  text:      string
  channel:   string
  authorId:  string
  createdAt: Date
}

// A task fully enriched with cross-linked PRs, messages, and assignee
export interface EnrichedTask {
  id:           string
  key:          string
  title:        string
  description:  string
  status:       UniversalTask['status']
  priority:     UniversalTask['priority']
  points:       number
  source:       UniversalTask['source']
  daysOpen:     number
  createdAt:    Date
  dueAt:        Date | null
  epicId:       string | null

  assigneeName:    string | null   // raw from task platform
  assigneeDev:     Developer | null  // matched HRIS developer
  prs:             LinkedPR[]
  messages:        LinkedMessage[]

  // computed
  isBlocked:         boolean
  hasOpenPR:         boolean
  longestPRWaitHours:number
}

export interface ConnectionStatus {
  jira:   boolean
  linear: boolean
  monday: boolean
  github: boolean
  slack:  boolean
  teams:  boolean
}

export interface UnifiedDataState {
  developers:    Developer[]
  teams:         Team[]
  divisions:     Division[]
  allTasks:      UniversalTask[]
  allPRs:        UniversalPR[]
  allMembers:    UniversalMember[]
  allMessages:   UniversalMessage[]
  allChannels:   UniversalChannel[]
  enrichedTasks: EnrichedTask[]
  connections:   ConnectionStatus
  isLoading:     boolean
  error:         string | null
  isLive:        boolean
  lastFetched:   Date | null
  // messaging send helpers
  slackConnectionId: string
  teamsConnectionId: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeName(n: string): string {
  return n.toLowerCase().replace(/[^a-z]/g, '')
}

function initials(name: string | undefined | null): string {
  return (name ?? '?').split(' ').map(p => p[0] ?? '').join('').toUpperCase().slice(0, 2) || '?'
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

// ── Cross-linking ─────────────────────────────────────────────────────────────

// Build a name-normalised lookup from HRIS members
function buildMemberByName(members: UniversalMember[]): Map<string, UniversalMember> {
  const m = new Map<string, UniversalMember>()
  for (const mem of members) {
    m.set(normalizeName(mem.name), mem)
    // also index by first name alone for partial matches
    const first = (mem.name ?? '').split(' ')[0]
    if (first && first.length > 2) m.set(normalizeName(first), mem)
  }
  return m
}

// Build taskKey → UniversalPR[] map
function buildPRsByKey(prs: UniversalPR[]): Map<string, UniversalPR[]> {
  const m = new Map<string, UniversalPR[]>()
  for (const pr of prs) {
    if (!pr.linkedTaskKey) continue
    const key = pr.linkedTaskKey
    if (!m.has(key)) m.set(key, [])
    m.get(key)!.push(pr)
  }
  return m
}

// Build taskKey → UniversalMessage[] map (from message mentions)
function buildMessagesByKey(messages: UniversalMessage[]): Map<string, UniversalMessage[]> {
  const m = new Map<string, UniversalMessage[]>()
  for (const msg of messages) {
    for (const key of msg.mentionedTaskKeys) {
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(msg)
    }
  }
  return m
}

// ── Build enriched tasks ───────────────────────────────────────────────────────

function buildEnrichedTasks(
  tasks:      UniversalTask[],
  prs:        UniversalPR[],
  messages:   UniversalMessage[],
  members:    UniversalMember[],
  developers: Developer[],
): EnrichedTask[] {
  const prsByKey  = buildPRsByKey(prs)
  const msgsByKey = buildMessagesByKey(messages)
  const memberByName = buildMemberByName(members)

  return tasks.map(t => {
    // Match assignee: try name from task, then fall back to member id lookup
    let assigneeDev: Developer | null = null
    if (t.assigneeName) {
      const mem = memberByName.get(normalizeName(t.assigneeName))
      if (mem) {
        assigneeDev = developers.find(d => d.id === mem.id) ?? null
      }
    }

    const taskPRs   = prsByKey.get(t.key)  ?? []
    const taskMsgs  = msgsByKey.get(t.key) ?? []

    const linkedPRs: LinkedPR[] = taskPRs.map(pr => ({
      id:           pr.id,
      number:       pr.number,
      title:        pr.title,
      sourceBranch: pr.sourceBranch,
      status:       pr.status,
      authorLogin:  pr.authorLogin,
      waitingHours: pr.waitingHours,
      mergedAt:     pr.mergedAt,
      url:          pr.url,
    }))

    const linkedMsgs: LinkedMessage[] = taskMsgs.slice(0, 5).map(m => ({
      id:        m.id,
      text:      m.text.slice(0, 200),
      channel:   m.channel || m.channelId,
      authorId:  m.authorId,
      createdAt: m.createdAt,
    }))

    const openPRs    = linkedPRs.filter(p => p.status === 'open' || p.status === 'approved' || p.status === 'changes-requested')
    const longestPR  = openPRs.reduce((max, p) => Math.max(max, p.waitingHours), 0)

    return {
      id:          t.id,
      key:         t.key,
      title:       t.title,
      description: t.description,
      status:      t.status,
      priority:    t.priority,
      points:      t.points,
      source:      t.source,
      daysOpen:    t.daysOpen,
      createdAt:   t.createdAt,
      dueAt:       t.dueAt,
      epicId:      t.epicId,

      assigneeName:    t.assigneeName,
      assigneeDev,
      prs:             linkedPRs,
      messages:        linkedMsgs,

      isBlocked:          t.status === 'blocked',
      hasOpenPR:          openPRs.length > 0,
      longestPRWaitHours: longestPR,
    }
  })
}

// ── Build Developer[] ──────────────────────────────────────────────────────────

function buildDevelopers(
  members:   UniversalMember[],
  tasks:     UniversalTask[],
  prs:       UniversalPR[],
  baseTeams: Team[],
): Developer[] {
  // Name-normalised task lookup for assigning tasks to members
  // Task assignee name ↔ member name fuzzy match
  const tasksByMemberName = new Map<string, UniversalTask[]>()
  for (const t of tasks) {
    const norm = normalizeName(t.assigneeName ?? '')
    if (!norm) continue
    if (!tasksByMemberName.has(norm)) tasksByMemberName.set(norm, [])
    tasksByMemberName.get(norm)!.push(t)
  }

  // PR author login ↔ member email/name match (best-effort)
  const prsByMemberId = new Map<string, UniversalPR[]>()
  for (const pr of prs) {
    if (!pr.authorId) continue
    if (!prsByMemberId.has(pr.authorId)) prsByMemberId.set(pr.authorId, [])
    prsByMemberId.get(pr.authorId)!.push(pr)
  }

  return members.map((m, idx) => {
    const nameNorm = normalizeName(m.name)
    const myRawTasks = tasksByMemberName.get(nameNorm) ?? []
    const myTasks: Task[] = myRawTasks.map(t => ({
      id: t.id, title: t.title, points: t.points, status: t.status,
    }))

    // Also try matching by member id for PRs
    const myRawPRs = prsByMemberId.get(m.id) ?? prsByMemberId.get(m.email) ?? []
    const myPR     = myRawPRs[0] ?? null

    const prStatus: PRStatus | null = myPR
      ? {
          number:       myPR.number || 100 + idx,
          title:        myPR.title,
          waitingHours: myPR.waitingHours,
          reviewer:     '',
          status:       myPR.status === 'merged' || myPR.status === 'closed' ? 'approved' : myPR.status,
        }
      : null

    const rl = riskFromTasks(myTasks, prStatus)
    const teamFallback = baseTeams[idx % Math.max(baseTeams.length, 1)]

    return {
      id:             m.id,
      name:           m.name,
      initials:       initials(m.name),
      role:           m.jobTitle || roleTitleLabel(m.role),
      teamId:         teamFallback?.id       ?? 'team-unknown',
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

function sortByRole(devs: Developer[]): Developer[] {
  const order: Record<string, number> = { cto: 0, divisionHead: 1, teamLead: 2, developer: 3 }
  return [...devs].sort((a, b) => {
    const ra = order[detectRole(a.role)] ?? 3
    const rb = order[detectRole(b.role)] ?? 3
    return ra !== rb ? ra - rb : (a.name ?? '').localeCompare(b.name ?? '')
  })
}

function enrichMock(devs: Developer[], tasks: UniversalTask[], prs: UniversalPR[]): Developer[] {
  if (tasks.length === 0 && prs.length === 0) return devs
  return devs.map((dev, i) => {
    const myTasks: Task[] = tasks
      .filter((_, ti) => ti % devs.length === i)
      .map(t => ({ id: t.id, title: t.title, points: t.points, status: t.status }))
    const myRawPR = prs.length > 0 ? prs[i % prs.length] : null
    const prStatus: PRStatus | null = myRawPR
      ? { number: 200 + i, title: myRawPR.title, waitingHours: myRawPR.waitingHours, reviewer: '', status: myRawPR.status === 'merged' || myRawPR.status === 'closed' ? 'approved' : myRawPR.status }
      : dev.prStatus
    if (!myTasks.length && !myRawPR) return dev
    const rl = riskFromTasks(myTasks.length ? myTasks : dev.tasks, prStatus)
    return { ...dev, tasks: myTasks.length ? myTasks : dev.tasks, prStatus, riskLevel: rl }
  })
}

// ── Context ────────────────────────────────────────────────────────────────────

const Ctx = createContext<UnifiedDataState | null>(null)

const INITIAL: UnifiedDataState = {
  developers:    mockDevelopers,
  teams:         mockTeams,
  divisions:     mockDivisions,
  allTasks:      [],
  allPRs:        [],
  allMembers:    [],
  allMessages:   [],
  allChannels:   [],
  enrichedTasks: [],
  connections:   { jira: false, linear: false, monday: false, github: false, slack: false, teams: false },
  isLoading:     IS_UNIFIED_LIVE,
  error:         null,
  isLive:        false,
  lastFetched:   null,
  slackConnectionId: SLACK_ID,
  teamsConnectionId: TEAMS_ID,
}

export function UnifiedDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UnifiedDataState>(INITIAL)

  useEffect(() => {
    if (!IS_UNIFIED_LIVE) return
    void fetchAll()
  }, [])

  async function fetchAll() {
    const client = getUnifiedClient()

    const [jiraTasks, linearTasks, mondayTasks, githubPRs, hrisMembers, slackMsgs, slackChannels] =
      await Promise.allSettled([
        getTasks(JIRA_ID,   client, 'jira'),
        getTasks(LINEAR_ID, client, 'linear'),
        getTasks(MONDAY_ID, client, 'monday'),
        getPullRequests(GITHUB_ID, client),
        getTeamMembers(HRIS_ID, client),
        getRecentMessages(SLACK_ID || TEAMS_ID, 200, client),
        getChannels(SLACK_ID || TEAMS_ID, client),
      ])

    const allTasks = [
      ...(jiraTasks.status   === 'fulfilled' ? jiraTasks.value   : []),
      ...(linearTasks.status === 'fulfilled' ? linearTasks.value : []),
      ...(mondayTasks.status === 'fulfilled' ? mondayTasks.value : []),
    ]
    const allPRs      = githubPRs.status    === 'fulfilled' ? githubPRs.value    : []
    const allMembers  = hrisMembers.status  === 'fulfilled' ? hrisMembers.value  : []
    const allMessages = slackMsgs.status    === 'fulfilled' ? slackMsgs.value    : []
    // Use API-listed channels; fall back to channels inferred from message channelIds
    const apiChannels = slackChannels.status === 'fulfilled' ? slackChannels.value : []
    const allMessages_tmp = slackMsgs.status === 'fulfilled' ? slackMsgs.value : []
    const inferredChannels: typeof apiChannels = apiChannels.length === 0
      ? [...new Map(
          allMessages_tmp
            .filter(m => m.channelId)
            .map(m => [m.channelId, { id: m.channelId, name: m.channel || m.channelId, description: '' }])
        ).values()]
      : []
    const allChannels = apiChannels.length > 0 ? apiChannels : inferredChannels

    const connections: ConnectionStatus = {
      jira:   jiraTasks.status   === 'fulfilled' && jiraTasks.value.length   > 0,
      linear: linearTasks.status === 'fulfilled' && linearTasks.value.length > 0,
      monday: mondayTasks.status === 'fulfilled' && mondayTasks.value.length > 0,
      github: githubPRs.status   === 'fulfilled' && githubPRs.value.length   > 0,
      slack:  slackMsgs.status   === 'fulfilled',
      teams:  !!(TEAMS_ID && slackMsgs.status === 'fulfilled'),
    }

    // Build developer list
    const developers = allMembers.length > 0
      ? sortByRole(buildDevelopers(allMembers, allTasks, allPRs, mockTeams))
      : sortByRole(enrichMock(mockDevelopers, allTasks, allPRs))

    // Build enriched tasks (cross-linked)
    const enrichedTasks = buildEnrichedTasks(allTasks, allPRs, allMessages, allMembers, developers)

    // Log cross-linking stats for debugging
    const linked = enrichedTasks.filter(t => t.prs.length > 0).length
    console.log(
      `[DevPulse] Loaded: ${allTasks.length} tasks, ${allPRs.length} PRs, ` +
      `${allMembers.length} members, ${allMessages.length} messages. ` +
      `Cross-linked: ${linked}/${allTasks.length} tasks have PRs.`
    )

    setState({
      developers,
      teams:         mockTeams,
      divisions:     mockDivisions,
      allTasks,
      allPRs,
      allMembers,
      allMessages,
      allChannels,
      enrichedTasks,
      connections,
      isLoading:     false,
      error:         null,
      isLive:        allTasks.length > 0 || allPRs.length > 0,
      lastFetched:   new Date(),
      slackConnectionId: SLACK_ID,
      teamsConnectionId: TEAMS_ID,
    })
  }

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

export function useUnifiedData(): UnifiedDataState {
  const c = useContext(Ctx)
  if (!c) throw new Error('useUnifiedData must be used within UnifiedDataProvider')
  return c
}
