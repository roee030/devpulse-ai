// src/lib/unified.ts
// Single wrapper around the Unified.to SDK.
// All other files import these helpers — the rest of the app never touches the SDK directly.
import { UnifiedTo } from '@unified-api/typescript-sdk'
import type { Connection } from '@unified-api/typescript-sdk/sdk/models/shared'
import type { UserRole } from '../data/mockData'

// ── Universal internal types ────────────────────────────────────────────────

export interface UniversalTask {
  id: string
  title: string
  assigneeId: string | null
  status: 'todo' | 'in-progress' | 'done' | 'blocked'
  points: number
  source: 'jira' | 'linear' | 'monday' | 'unknown'
}

export interface UniversalPR {
  id: string
  title: string
  authorId: string
  status: 'open' | 'approved' | 'changes-requested'
  createdAt: Date
  waitingHours: number
}

export interface UniversalMember {
  id: string
  name: string
  email: string
  jobTitle: string
  department: string
  role: UserRole
  managerId: string | null
}

export interface UniversalMessage {
  id: string
  text: string
  authorId: string
  channelId: string
  createdAt: Date
}

export type { Connection }

// ── Role detection ────────────────────────────────────────────────────────────
// Maps a job title / department string to one of DevPulse's four role tiers.

export function detectRole(title: string, department = ''): UserRole {
  const t = (title + ' ' + department).toLowerCase()
  if (
    t.includes('cto') ||
    t.includes('chief technology') ||
    t.includes('head of engineering') ||
    t.includes('vp engineering') ||
    t.includes('vp of engineering')
  ) return 'cto'
  if (
    t.includes('vp') ||
    t.includes('vice president') ||
    t.includes('director') ||
    t.includes('division head') ||
    (t.includes('engineering manager') && t.includes('senior'))
  ) return 'divisionHead'
  if (
    t.includes('tech lead') ||
    t.includes('team lead') ||
    t.includes('engineering manager') ||
    t.includes('principal') ||
    t.includes('staff engineer') ||
    t.includes('architect')
  ) return 'teamLead'
  return 'developer'
}

// ── SDK factory ─────────────────────────────────────────────────────────────

export function createUnifiedClient(apiKey: string): UnifiedTo {
  return new UnifiedTo({ security: { jwt: apiKey } })
}

let _browserClient: UnifiedTo | null = null

export function getUnifiedClient(): UnifiedTo {
  if (!_browserClient) {
    const key = import.meta.env.VITE_UNIFIED_API_KEY ?? ''
    _browserClient = new UnifiedTo({ security: { jwt: key } })
  }
  return _browserClient
}

// ── Status mappers ───────────────────────────────────────────────────────────

function mapTaskStatus(s?: string): UniversalTask['status'] {
  if (!s) return 'todo'
  const u = s.toUpperCase()
  if (u === 'COMPLETED' || u === 'DONE' || u === 'CLOSED') return 'done'
  if (u === 'IN_PROGRESS' || u === 'STARTED') return 'in-progress'
  if (u === 'BLOCKED' || u === 'ON_HOLD') return 'blocked'
  return 'todo'
}

function mapPRStatus(s?: string): UniversalPR['status'] {
  if (!s) return 'open'
  const u = s.toUpperCase()
  if (u === 'APPROVED' || u === 'MERGED') return 'approved'
  if (u === 'REJECTED' || u === 'DECLINED') return 'changes-requested'
  return 'open'
}

function extractPoints(tags: string[]): number {
  for (const tag of tags) {
    const m = tag.match(/points?:(\d+)/i) ?? tag.match(/^(\d+)$/)
    if (m) return parseInt(m[1])
  }
  return 0
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function getTasks(
  connectionId: string,
  client: UnifiedTo = getUnifiedClient(),
  source: UniversalTask['source'] = 'unknown',
): Promise<UniversalTask[]> {
  if (!connectionId) return []
  try {
    const tasks = await client.task.listTaskTasks({ connectionId })
    return tasks.map(t => ({
      id: t.id ?? crypto.randomUUID(),
      title: t.name ?? 'Untitled task',
      assigneeId: t.assignedUserIds?.[0] ?? null,
      status: mapTaskStatus(t.status),
      points: extractPoints(t.tags ?? []),
      source,
    }))
  } catch {
    return []
  }
}

// ── Members (via HRIS) ────────────────────────────────────────────────────────
// Team members come from the HRIS integration (employees endpoint).
// Unified's task platform connections don't expose a /members endpoint.

export async function getTeamMembers(
  connectionId: string,
  client: UnifiedTo = getUnifiedClient(),
): Promise<UniversalMember[]> {
  if (!connectionId) return []
  try {
    const employees = await client.hris.listHrisEmployees({ connectionId })
    return employees.map(e => {
      const firstName = e.firstName ?? ''
      const lastName  = e.lastName  ?? ''
      const fullName  = [firstName, lastName].filter(Boolean).join(' ')
      const name      = (e.name ?? fullName) || 'Unknown'
      const email     = e.emails?.[0]?.email ?? ''
      const groups    = e.groups ?? []
      const dept      = groups[0]?.name ?? ''
      const titleRaw  = groups.map(g => g.name).join(', ')
      return {
        id:         e.id ?? crypto.randomUUID(),
        name,
        email,
        jobTitle:   titleRaw || 'Software Engineer',
        department: dept,
        role:       detectRole(titleRaw, dept),
        managerId:  e.managerId ?? null,
      }
    })
  } catch {
    return []
  }
}

// ── Pull Requests ─────────────────────────────────────────────────────────────

export async function getPullRequests(
  connectionId: string,
  client: UnifiedTo = getUnifiedClient(),
): Promise<UniversalPR[]> {
  if (!connectionId) return []
  try {
    const prs = await client.repo.listRepoPullrequests({ connectionId })
    return prs.map(pr => {
      const created     = pr.createdAt ?? new Date()
      const waitingHours = Math.round((Date.now() - created.getTime()) / 3_600_000)
      const label       = pr.labels?.[0] ?? ''
      return {
        id:           pr.id ?? crypto.randomUUID(),
        title:        label ? `${label} PR` : 'Pull request',
        authorId:     pr.userIds?.[0] ?? '',
        status:       mapPRStatus(pr.status),
        createdAt:    created,
        waitingHours,
      }
    })
  } catch {
    return []
  }
}

// ── Messaging ─────────────────────────────────────────────────────────────────

export async function getRecentMessages(
  connectionId: string,
  limit = 50,
  client: UnifiedTo = getUnifiedClient(),
): Promise<UniversalMessage[]> {
  if (!connectionId) return []
  try {
    const msgs = await client.message.listMessagingMessages({ connectionId })
    return msgs.slice(0, limit).map(m => ({
      id:        m.id ?? crypto.randomUUID(),
      text:      m.message ?? '',
      authorId:  m.authorMember?.userId ?? '',
      channelId: m.channelId ?? '',
      createdAt: m.createdAt ?? new Date(),
    }))
  } catch {
    return []
  }
}

export async function sendAlert(
  connectionId: string,
  _userId: string,
  message: string,
  client: UnifiedTo = getUnifiedClient(),
): Promise<void> {
  if (!connectionId) return
  await client.message.createMessagingMessage({
    connectionId,
    messagingMessage: { message },
  })
}

// ── Connections ───────────────────────────────────────────────────────────────

export async function getConnections(
  client: UnifiedTo = getUnifiedClient(),
): Promise<Connection[]> {
  try {
    return await client.unified.listUnifiedConnections({})
  } catch {
    return []
  }
}

export async function getIntegrationAuthUrl(
  integrationType: string,
  workspaceId: string,
  client: UnifiedTo = getUnifiedClient(),
): Promise<string> {
  return client.unified.getUnifiedIntegrationAuth({
    integrationType,
    workspaceId,
    successRedirect: `${window.location.origin}/settings/integrations`,
    failureRedirect: `${window.location.origin}/settings/integrations?error=1`,
  })
}
