// src/lib/unified.ts
// Single wrapper around the Unified.to SDK.
// All other files import these helpers — the rest of the app never touches the SDK directly.
import { UnifiedTo } from '@unified-api/typescript-sdk'
import type { Connection } from '@unified-api/typescript-sdk/sdk/models/shared'
import type { UserRole } from '../data/mockData'

// ── Regex ─────────────────────────────────────────────────────────────────────
// Matches Jira / Linear / Monday style task keys: PROJ-42, DEV-123, BE-7
export const TASK_KEY_RE = /\b([A-Z][A-Z0-9_]{1,9}-\d+)\b/

// ── Universal internal types ──────────────────────────────────────────────────

export interface UniversalTask {
  id:            string
  key:           string          // "PROJ-42" — extracted or generated
  title:         string
  description:   string
  assigneeId:    string | null
  assigneeName:  string | null   // name from task assignedUsers if available
  status:        'todo' | 'in-progress' | 'done' | 'blocked'
  priority:      'critical' | 'high' | 'medium' | 'low'
  points:        number
  source:        'jira' | 'linear' | 'monday' | 'unknown'
  createdAt:     Date
  updatedAt:     Date | null
  dueAt:         Date | null
  daysOpen:      number
  epicId:        string | null
}

export interface UniversalPR {
  id:             string
  number:         number
  title:          string
  sourceBranch:   string          // feature/PROJ-42-login-flow
  linkedTaskKey:  string | null   // extracted from branch or title
  authorId:       string
  authorLogin:    string
  status:         'open' | 'approved' | 'changes-requested' | 'merged' | 'closed'
  createdAt:      Date
  mergedAt:       Date | null
  waitingHours:   number
  url:            string
}

export interface UniversalMember {
  id:         string
  name:       string
  email:      string
  jobTitle:   string
  department: string
  role:       UserRole
  managerId:  string | null
}

export interface UniversalMessage {
  id:        string
  text:      string
  authorId:  string
  channelId: string
  channel:   string              // channel name for display
  createdAt: Date
  mentionedTaskKeys: string[]    // task keys found in the message text
}

export interface UniversalChannel {
  id:          string
  name:        string
  description: string
}

export type { Connection }

// ── Role detection ─────────────────────────────────────────────────────────────

export function detectRole(title: string, department = ''): UserRole {
  const t = (title + ' ' + department).toLowerCase()
  if (t.includes('cto') || t.includes('chief technology') ||
      t.includes('head of engineering') || t.includes('vp engineering') ||
      t.includes('vp of engineering')) return 'cto'
  if (t.includes('vp') || t.includes('vice president') || t.includes('director') ||
      t.includes('division head') ||
      (t.includes('engineering manager') && t.includes('senior'))) return 'divisionHead'
  if (t.includes('tech lead') || t.includes('team lead') ||
      t.includes('engineering manager') || t.includes('principal') ||
      t.includes('staff engineer') || t.includes('architect')) return 'teamLead'
  return 'developer'
}

// ── SDK factory ───────────────────────────────────────────────────────────────

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

// ── Status mappers ────────────────────────────────────────────────────────────

function mapTaskStatus(s?: string): UniversalTask['status'] {
  if (!s) return 'todo'
  const u = s.toUpperCase()
  if (u === 'COMPLETED' || u === 'DONE' || u === 'CLOSED' || u === 'FINISHED') return 'done'
  if (u === 'IN_PROGRESS' || u === 'STARTED' || u === 'INPROGRESS' || u === 'IN PROGRESS') return 'in-progress'
  if (u === 'BLOCKED' || u === 'ON_HOLD' || u === 'STUCK') return 'blocked'
  return 'todo'
}

function mapPRStatus(s?: string): UniversalPR['status'] {
  if (!s) return 'open'
  const u = s.toUpperCase()
  if (u === 'MERGED') return 'merged'
  if (u === 'CLOSED') return 'closed'
  if (u === 'APPROVED') return 'approved'
  if (u === 'REJECTED' || u === 'DECLINED' || u === 'CHANGES_REQUESTED') return 'changes-requested'
  return 'open'
}

function mapPriority(s?: string): UniversalTask['priority'] {
  if (!s) return 'medium'
  const u = s.toUpperCase()
  if (u === 'CRITICAL' || u === 'URGENT' || u === 'P0') return 'critical'
  if (u === 'HIGH' || u === 'P1') return 'high'
  if (u === 'LOW' || u === 'P3' || u === 'MINOR') return 'low'
  return 'medium'
}

function extractPoints(tags: string[]): number {
  for (const tag of tags) {
    const m = tag.match(/points?:(\d+)/i) ?? tag.match(/^(\d+)$/)
    if (m) return parseInt(m[1])
  }
  return 0
}

// Extract task key (PROJ-42) from a task's identifier / title / tags
function extractTaskKey(
  rawObj: Record<string, unknown>,
  title: string,
  source: string,
  index: number,
): string {
  // 1. Dedicated identifier field (Jira provides this as `identifier` or `number`)
  const ident = (rawObj['identifier'] ?? rawObj['key'] ?? rawObj['number']) as string | undefined
  if (ident && TASK_KEY_RE.test(String(ident))) return String(ident)

  // 2. Key embedded in title like "[PROJ-42] Fix auth" or "PROJ-42: Fix auth"
  const fromTitle = title.match(TASK_KEY_RE)
  if (fromTitle) return fromTitle[1]

  // 3. Fall back to synthetic key
  const prefix = source === 'jira' ? 'JIRA' : source === 'linear' ? 'LIN' : source === 'monday' ? 'MON' : 'TASK'
  return `${prefix}-${index + 1}`
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

export async function getTasks(
  connectionId: string,
  client: UnifiedTo = getUnifiedClient(),
  source: UniversalTask['source'] = 'unknown',
): Promise<UniversalTask[]> {
  if (!connectionId) return []
  try {
    const raw = await client.task.listTaskTasks({ connectionId })
    return raw.map((t, i) => {
      const ro    = t as unknown as Record<string, unknown>
      const title = (t.name ?? 'Untitled task').trim()
      const key   = extractTaskKey(ro, title, source, i)
      const now   = Date.now()
      const created = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt ?? now)
      const daysOpen = Math.round((now - created.getTime()) / 86_400_000)

      // assignee name from assignedUsers if present
      const assignedUsers = (ro['assignedUsers'] ?? []) as Array<{name?: string; email?: string}>
      const assigneeName  = assignedUsers[0]?.name ?? null

      return {
        id:           t.id ?? crypto.randomUUID(),
        key,
        title,
        description:  (ro['description'] as string | undefined) ?? '',
        assigneeId:   t.assignedUserIds?.[0] ?? null,
        assigneeName,
        status:       mapTaskStatus(t.status),
        priority:     mapPriority((ro['priority'] as string | undefined)),
        points:       extractPoints(t.tags ?? []),
        source,
        createdAt:    created,
        updatedAt:    (ro['updatedAt'] as Date | undefined) ?? null,
        dueAt:        (t.dueAt instanceof Date ? t.dueAt : t.dueAt ? new Date(t.dueAt) : null),
        daysOpen,
        epicId:       (ro['parentId'] as string | undefined) ?? null,
      }
    })
  } catch (e) {
    console.warn(`[unified] getTasks(${source}) failed:`, e)
    return []
  }
}

// ── Members (via HRIS) ─────────────────────────────────────────────────────────

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
  } catch (e) {
    console.warn('[unified] getTeamMembers failed:', e)
    return []
  }
}

// ── Pull Requests ──────────────────────────────────────────────────────────────

export async function getPullRequests(
  connectionId: string,
  client: UnifiedTo = getUnifiedClient(),
): Promise<UniversalPR[]> {
  if (!connectionId) return []
  try {
    const prs = await client.repo.listRepoPullrequests({ connectionId })
    return prs.map((pr, i) => {
      const ro           = pr as unknown as Record<string, unknown>
      const created      = pr.createdAt instanceof Date ? pr.createdAt
                         : new Date((pr.createdAt as unknown as string | number) ?? Date.now())
      const mergedAt     = (ro['mergedAt'] as Date | undefined) ?? null
      const waitingHours = Math.round((Date.now() - created.getTime()) / 3_600_000)

      // Branch name — the critical field for task linkage
      const sourceBranch  = String(ro['sourceBranch'] ?? ro['branchName'] ?? ro['branch'] ?? pr.labels?.[0] ?? '')
      // PR title — not in TS types but usually present at runtime
      const prTitle       = String(ro['title'] ?? ro['name'] ?? (sourceBranch ? `PR: ${sourceBranch}` : 'Pull request'))
      // Author login / handle
      const authorLogin   = String(ro['authorLogin'] ?? ro['login'] ?? ro['author'] ?? '')
      // PR number
      const prNumber      = Number(ro['number'] ?? ro['iid'] ?? i + 1)
      // Extract task key from branch or title
      const linkedTaskKey = (sourceBranch.match(TASK_KEY_RE) ?? prTitle.match(TASK_KEY_RE))?.[1] ?? null
      // URL
      const url           = String(ro['htmlUrl'] ?? ro['url'] ?? ro['webUrl'] ?? '')

      return {
        id:            pr.id ?? crypto.randomUUID(),
        number:        prNumber,
        title:         prTitle,
        sourceBranch,
        linkedTaskKey,
        authorId:      pr.userIds?.[0] ?? '',
        authorLogin,
        status:        mapPRStatus(pr.status),
        createdAt:     created,
        mergedAt,
        waitingHours,
        url,
      }
    })
  } catch (e) {
    console.warn('[unified] getPullRequests failed:', e)
    return []
  }
}

// ── Messaging channels ────────────────────────────────────────────────────────

export async function getChannels(
  connectionId: string,
  client: UnifiedTo = getUnifiedClient(),
): Promise<UniversalChannel[]> {
  if (!connectionId) return []
  try {
    // The SDK exposes channels via listMessagingChannels when available;
    // if the method doesn't exist at runtime, return empty gracefully.
    const msgClient = client.message as unknown as Record<string, Function>
    if (typeof msgClient['listMessagingChannels'] !== 'function') return []
    const channels: unknown[] = await msgClient['listMessagingChannels']({ connectionId })
    return (channels as Array<Record<string, unknown>>).map(c => ({
      id:          String(c['id'] ?? crypto.randomUUID()),
      name:        String(c['name'] ?? 'channel'),
      description: String(c['description'] ?? ''),
    }))
  } catch (e) {
    console.warn('[unified] getChannels failed:', e)
    return []
  }
}

// ── Messages ──────────────────────────────────────────────────────────────────

export async function getRecentMessages(
  connectionId: string,
  limitCount = 200,
  client: UnifiedTo = getUnifiedClient(),
): Promise<UniversalMessage[]> {
  if (!connectionId) return []
  try {
    const msgs = await client.message.listMessagingMessages({ connectionId })
    return msgs.slice(0, limitCount).map(m => {
      const text    = m.message ?? ''
      const taskKeys = [...text.matchAll(new RegExp(TASK_KEY_RE.source, 'g'))].map(r => r[1])
      return {
        id:                m.id ?? crypto.randomUUID(),
        text,
        authorId:          m.authorMember?.userId ?? '',
        channelId:         m.channelId ?? '',
        channel:           (m as unknown as Record<string, unknown>)['channelName'] as string ?? '',
        createdAt:         m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt ?? Date.now()),
        mentionedTaskKeys: [...new Set(taskKeys)],
      }
    })
  } catch (e) {
    console.warn('[unified] getRecentMessages failed:', e)
    return []
  }
}

// ── Post a message ────────────────────────────────────────────────────────────

export async function postMessage(
  connectionId: string,
  channelId: string,
  text: string,
  client: UnifiedTo = getUnifiedClient(),
): Promise<boolean> {
  if (!connectionId) return false
  try {
    await client.message.createMessagingMessage({
      connectionId,
      messagingMessage: {
        channelId,
        message: text,
      },
    })
    return true
  } catch (e) {
    console.warn('[unified] postMessage failed:', e)
    return false
  }
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
