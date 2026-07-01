// src/lib/aiEffortStore.ts
// Read/write AI effort events from Firebase Firestore.
// Each developer's local agent pushes events here;
// the team-lead dashboard reads them all.
import {
  collection, addDoc, query, where,
  orderBy, limit, getDocs, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface AIEffortEvent {
  id?:             string
  workspaceId:     string   // Firebase project = workspace scope
  timestamp:       Date
  userId:          string   // git user.email
  userName:        string   // git user.name
  branch:          string
  taskId:          string | null
  promptTokens:    number
  completionTokens:number
  totalTokens:     number
  model:           string
  source:          'browser-extension' | 'https-proxy' | 'manual' | 'vscode-extension'
  file?:           string
}

export interface TaskEffortSummary {
  taskId:      string
  totalTokens: number
  events:      number
  developers:  string[]
}

export interface DeveloperEffortSummary {
  userId:      string
  userName:    string
  totalTokens: number
  events:      number
  tasks:       string[]
}

// ── Synthetic demo data ────────────────────────────────────────────────────────

export function makeDemoEvents(teamMembers: string[], taskKeys?: string[]): AIEffortEvent[] {
  // Use real task keys when provided (from Jira/Linear via Unified.to), else fall back to generic ones
  const defaultTasks = ['PROJ-42', 'PROJ-38', 'PROJ-51', 'PROJ-29', 'PROJ-61', 'PROJ-33']
  const tasks   = (taskKeys && taskKeys.length >= 2) ? taskKeys.slice(0, 10) : defaultTasks
  const models  = ['gpt-4o', 'copilot', 'claude-3-5-sonnet']
  const sources  = ['browser-extension', 'vscode-extension', 'manual'] as const
  const now     = Date.now()
  const events: AIEffortEvent[] = []

  const devData = [
    { userId: 'alice@team.dev',   userName: 'Alice Chen',      tasks: [tasks[0], tasks[2] ?? tasks[0]], tokBase: 4200 },
    { userId: 'bob@team.dev',     userName: 'Bob Martinez',    tasks: [tasks[1], tasks[3] ?? tasks[1]], tokBase: 2800 },
    { userId: 'carol@team.dev',   userName: 'Carol Liu',       tasks: [tasks[4] ?? tasks[0], tasks[0]], tokBase: 6100 },
    { userId: 'david@team.dev',   userName: 'David Singh',     tasks: [tasks[5] ?? tasks[1], tasks[1]], tokBase: 1900 },
    { userId: 'emma@team.dev',    userName: 'Emma Kowalski',   tasks: [tasks[2] ?? tasks[0], tasks[3] ?? tasks[1]], tokBase: 3400 },
  ]

  // Use real team members if provided, else use synthetic names
  const validMembers = teamMembers.filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
  const people = validMembers.length > 0
    ? validMembers.map((name, i) => ({
        userId:   `${name.toLowerCase().replace(/\s+/g, '.')}@team.dev`,
        userName: name,
        tasks:    [tasks[i % tasks.length], tasks[(i + 1) % tasks.length]],
        tokBase:  2000 + Math.floor(Math.random() * 4000),
      }))
    : devData

  for (const dev of people) {
    const sessionCount = 3 + Math.floor(Math.random() * 5)
    for (let i = 0; i < sessionCount; i++) {
      const task = dev.tasks[i % dev.tasks.length]
      const prompt     = Math.floor(dev.tokBase * (0.6 + Math.random() * 0.4))
      const completion = Math.floor(prompt * (0.1 + Math.random() * 0.2))
      events.push({
        workspaceId:     'demo',
        timestamp:       new Date(now - Math.random() * 7 * 86_400_000),
        userId:          dev.userId,
        userName:        dev.userName,
        branch:          `feature/${task}-task`,
        taskId:          task,
        promptTokens:    prompt,
        completionTokens:completion,
        totalTokens:     prompt + completion,
        model:           models[Math.floor(Math.random() * models.length)],
        source:          sources[Math.floor(Math.random() * sources.length)],
      })
    }
  }
  return events
}

// ── Aggregation helpers ────────────────────────────────────────────────────────

export function aggregateByTask(events: AIEffortEvent[]): TaskEffortSummary[] {
  const map = new Map<string, TaskEffortSummary>()
  for (const e of events) {
    const key = e.taskId ?? '(unattributed)'
    const cur = map.get(key) ?? { taskId: key, totalTokens: 0, events: 0, developers: [] }
    cur.totalTokens += e.totalTokens
    cur.events      += 1
    if (!cur.developers.includes(e.userName)) cur.developers.push(e.userName)
    map.set(key, cur)
  }
  return Array.from(map.values()).sort((a, b) => b.totalTokens - a.totalTokens)
}

export function aggregateByDeveloper(events: AIEffortEvent[]): DeveloperEffortSummary[] {
  const map = new Map<string, DeveloperEffortSummary>()
  for (const e of events) {
    const cur = map.get(e.userId) ?? {
      userId: e.userId, userName: e.userName,
      totalTokens: 0, events: 0, tasks: [],
    }
    cur.totalTokens += e.totalTokens
    cur.events      += 1
    if (e.taskId && !cur.tasks.includes(e.taskId)) cur.tasks.push(e.taskId)
    map.set(e.userId, cur)
  }
  return Array.from(map.values()).sort((a, b) => b.totalTokens - a.totalTokens)
}

// ── Firebase read ──────────────────────────────────────────────────────────────

export async function fetchTeamEvents(
  workspaceId: string,
  daysBack = 7,
): Promise<AIEffortEvent[]> {
  if (!db) return []
  const since = new Date(Date.now() - daysBack * 86_400_000)
  const q = query(
    collection(db, 'ai_effort'),
    where('workspaceId', '==', workspaceId),
    where('timestamp', '>=', Timestamp.fromDate(since)),
    orderBy('timestamp', 'desc'),
    limit(500),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      id:        d.id,
      timestamp: (data.timestamp as Timestamp).toDate(),
    } as AIEffortEvent
  })
}

// ── Firebase write (called from agent or browser extension) ───────────────────

export async function pushEvent(event: Omit<AIEffortEvent, 'id'>): Promise<string | null> {
  if (!db) return null
  const ref = await addDoc(collection(db, 'ai_effort'), {
    ...event,
    timestamp: Timestamp.fromDate(event.timestamp),
  })
  return ref.id
}
