// src/lib/unified.ts
// Single wrapper around the Unified.to SDK.
// All other files import these helpers — the rest of the app never touches the SDK directly.
import { UnifiedTo } from '@unified-api/typescript-sdk'
import type { Connection } from '@unified-api/typescript-sdk/sdk/models/shared'

// ── Universal internal types ────────────────────────────────────────────────
// Stable contract used by the rest of the app — source changes, types don't.

export interface UniversalTask {
  id: string
  title: string
  assigneeId: string | null
  status: 'todo' | 'in-progress' | 'done' | 'blocked'
  points: number
}

export interface UniversalPR {
  id: string
  title: string
  authorId: string
  status: 'open' | 'approved' | 'changes-requested'
  createdAt: Date
  waitingHours: number
}

export interface UniversalUser {
  id: string
  name: string
  email: string
}

export type { Connection }

// ── SDK factory ─────────────────────────────────────────────────────────────

export function createUnifiedClient(apiKey: string): UnifiedTo {
  return new UnifiedTo({ security: { jwt: apiKey } })
}

// Browser-only singleton — reads from Vite env
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
  if (s === 'COMPLETED') return 'done'
  if (s === 'IN_PROGRESS') return 'in-progress'
  return 'todo'
}

function mapPRStatus(s?: string): UniversalPR['status'] {
  if (s === 'APPROVED') return 'approved'
  if (s === 'REJECTED') return 'changes-requested'
  return 'open'
}

// ── Data fetchers ────────────────────────────────────────────────────────────

export async function getTasks(
  connectionId: string,
  client: UnifiedTo = getUnifiedClient(),
): Promise<UniversalTask[]> {
  if (!connectionId) return []
  const tasks = await client.task.listTaskTasks({ connectionId })
  return tasks.map(t => ({
    id: t.id ?? crypto.randomUUID(),
    title: t.name ?? 'Untitled task',
    assigneeId: t.assignedUserIds?.[0] ?? null,
    status: mapTaskStatus(t.status),
    points: 0,
  }))
}

export async function getPullRequests(
  connectionId: string,
  client: UnifiedTo = getUnifiedClient(),
): Promise<UniversalPR[]> {
  if (!connectionId) return []
  const prs = await client.repo.listRepoPullrequests({ connectionId })
  return prs.map(pr => {
    const created = pr.createdAt ?? new Date()
    const waitingHours = Math.round((Date.now() - created.getTime()) / 3_600_000)
    return {
      id: pr.id ?? crypto.randomUUID(),
      title: '',
      authorId: pr.userIds?.[0] ?? '',
      status: mapPRStatus(pr.status),
      createdAt: created,
      waitingHours,
    }
  })
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

export async function getTeamMembers(
  connectionId: string,
  client: UnifiedTo = getUnifiedClient(),
): Promise<UniversalUser[]> {
  if (!connectionId) return []
  const employees = await client.hris.listHrisEmployees({ connectionId })
  return employees.map(e => ({
    id: e.id ?? crypto.randomUUID(),
    name: [e.firstName, e.lastName].filter(Boolean).join(' ') || 'Unknown',
    email: e.emails?.[0]?.email ?? '',
  }))
}

export async function getConnections(
  client: UnifiedTo = getUnifiedClient(),
): Promise<Connection[]> {
  return client.unified.listUnifiedConnections({})
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
