// scripts/link-prs-to-tasks.ts
// Lists existing tasks from all connections, extracts their synthetic keys
// (e.g. JIRA-1, LIN-2), then creates GitHub PRs with those keys in labels
// so the app's cross-linking engine can link them.
//
// Run: npx tsx --env-file=.env.local scripts/link-prs-to-tasks.ts
import { UnifiedTo } from '@unified-api/typescript-sdk'

const API_KEY    = process.env.UNIFIED_API_KEY ?? ''
const JIRA_ID    = process.env.UNIFIED_JIRA_CONNECTION_ID   ?? ''
const LINEAR_ID  = process.env.UNIFIED_LINEAR_CONNECTION_ID ?? ''
const MONDAY_ID  = process.env.UNIFIED_MONDAY_CONNECTION_ID ?? ''
const GITHUB_ID  = process.env.UNIFIED_GITHUB_CONNECTION_ID ?? ''

if (!API_KEY)    { console.error('[link] UNIFIED_API_KEY not set'); process.exit(1) }
if (!GITHUB_ID)  { console.error('[link] UNIFIED_GITHUB_CONNECTION_ID not set'); process.exit(1) }

const sdk = new UnifiedTo({ security: { jwt: API_KEY } })

// Mirrors the extractTaskKey logic from src/lib/unified.ts
const TASK_KEY_RE = /\b([A-Z][A-Z0-9_]{1,9}-\d+)\b/

function extractTaskKey(rawObj: Record<string, unknown>, title: string, source: string, index: number): string {
  const ident = (rawObj['identifier'] ?? rawObj['key'] ?? rawObj['number']) as string | undefined
  if (ident && TASK_KEY_RE.test(String(ident))) return String(ident)
  const fromTitle = title.match(TASK_KEY_RE)
  if (fromTitle) return fromTitle[1]
  const prefix = source === 'jira' ? 'JIRA' : source === 'linear' ? 'LIN' : source === 'monday' ? 'MON' : 'TASK'
  return `${prefix}-${index + 1}`
}

async function listTasksForConnection(connectionId: string, source: string) {
  if (!connectionId) return []
  try {
    return await sdk.task.listTaskTasks({ connectionId })
  } catch {
    // Fan-out: some platforms require project_id
    try {
      const projects = await sdk.task.listTaskProjects({ connectionId })
      const perProject = await Promise.all(
        projects.map(p => p.id
          ? sdk.task.listTaskTasks({ connectionId, projectId: p.id }).catch(() => [])
          : Promise.resolve([]))
      )
      return perProject.flat()
    } catch {
      console.log(`[link] Could not list tasks for ${source}`)
      return []
    }
  }
}

async function main() {
  console.log('[link] Fetching existing tasks to extract keys…\n')

  const [jiraTasks, linearTasks, mondayTasks] = await Promise.all([
    listTasksForConnection(JIRA_ID,   'jira'),
    listTasksForConnection(LINEAR_ID, 'linear'),
    listTasksForConnection(MONDAY_ID, 'monday'),
  ])

  const allTasks = [
    ...jiraTasks.map((t, i)   => ({ raw: t as Record<string, unknown>, source: 'jira',   index: i })),
    ...linearTasks.map((t, i) => ({ raw: t as Record<string, unknown>, source: 'linear', index: i })),
    ...mondayTasks.map((t, i) => ({ raw: t as Record<string, unknown>, source: 'monday', index: i })),
  ]

  const taskKeys = allTasks.slice(0, 6).map(({ raw, source, index }) => {
    const title = String(raw['name'] ?? 'Untitled')
    return extractTaskKey(raw, title, source, index)
  })

  console.log(`[link] Found ${allTasks.length} total tasks. Using first ${taskKeys.length} keys:`)
  taskKeys.forEach((k, i) => console.log(`  ${i + 1}. ${k}`))

  console.log('\n[link] Creating GitHub PRs with task-key labels…')

  const now = new Date()
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600 * 1000)
  const oneDayAgo    = new Date(now.getTime() - 1 * 24 * 3600 * 1000)

  // Statuses and ages to make the data interesting
  const configs = [
    { status: 'PENDING'  as const, createdAt: threeDaysAgo },
    { status: 'REJECTED' as const, createdAt: oneDayAgo    },
    { status: 'PENDING'  as const, createdAt: oneDayAgo    },
    { status: 'APPROVED' as const, createdAt: threeDaysAgo },
    { status: 'PENDING'  as const, createdAt: now          },
    { status: 'MERGED'   as const, createdAt: threeDaysAgo },
  ]

  let created = 0
  for (let i = 0; i < taskKeys.length; i++) {
    const key    = taskKeys[i]
    const config = configs[i % configs.length]
    try {
      const pr = await sdk.repo.createRepoPullrequest({
        connectionId: GITHUB_ID,
        repoPullrequest: {
          status:    config.status,
          createdAt: config.createdAt,
          // labels[0] = task key → extractTaskKey reads pr.labels[0] as sourceBranch fallback
          labels:    [key, 'feat'],
        },
      })
      console.log(`[link] PR created → ${pr.id} (key: ${key}, status: ${config.status})`)
      created++
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      console.warn(`[link] Failed to create PR for ${key}: ${msg.slice(0, 120)}`)
    }
  }

  console.log(`\n[link] Done — ${created}/${taskKeys.length} PRs created.`)
  console.log('[link] Reload the app to see cross-linked tasks.')
}

main().catch(e => {
  console.error('[link] Script failed:', e)
  process.exit(1)
})
