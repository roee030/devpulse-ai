// scripts/seed-sandbox.ts
// Seed ALL connected platforms (Jira, Linear, Monday) with known test data via Unified.to SDK.
// Usage: npx tsx scripts/seed-sandbox.ts
import { UnifiedTo } from '@unified-api/typescript-sdk'

const UNIFIED_API_KEY = process.env.UNIFIED_API_KEY ?? ''

if (!UNIFIED_API_KEY) {
  console.warn('[seed] WARNING: UNIFIED_API_KEY not set — API calls will fail auth.')
}

const sdk = new UnifiedTo({ security: { jwt: UNIFIED_API_KEY } })

// All task management platforms to seed
const TASK_PLATFORMS = [
  { name: 'Jira',   connectionId: process.env.UNIFIED_JIRA_CONNECTION_ID ?? '' },
  { name: 'Linear', connectionId: process.env.UNIFIED_LINEAR_CONNECTION_ID ?? '' },
  { name: 'Monday', connectionId: process.env.UNIFIED_MONDAY_CONNECTION_ID ?? '' },
]

// Messaging platforms for alert routing
const MSG_PLATFORMS = [
  { name: 'Slack', connectionId: process.env.UNIFIED_SLACK_CONNECTION_ID ?? '' },
  { name: 'Teams', connectionId: process.env.UNIFIED_TEAMS_CONNECTION_ID ?? '' },
]

// ── Seed task platforms ───────────────────────────────────────────────────────

async function seedTaskPlatform(name: string, connectionId: string) {
  if (!connectionId) {
    console.log(`[seed] Skipping ${name} — no connection ID set`)
    return
  }
  console.log(`[seed] Seeding ${name} (${connectionId})…`)

  // Create the sprint project
  const project = await sdk.task.createTaskProject({
    connectionId,
    taskProject: { name: 'Sprint 24 — Auth Refactor' },
  })
  console.log(`[seed] ${name}: project created → ${project.id}`)

  // Tasks matching the known test data
  const tasks: Array<{ name: string; assignee: string; points: string; status: string }> = [
    { name: 'DP-1: Auth Service Refactor',  assignee: 'noa.levi',     points: '5',  status: 'IN_PROGRESS' },
    { name: 'DP-2: Payment Module Fix',     assignee: 'avi.shapiro',  points: '3',  status: 'COMPLETED' },
    { name: 'DP-3: Mobile Login Bug',       assignee: 'tom.levi',     points: '8',  status: 'OPENED' },
    { name: 'DP-4: UI Component Update',    assignee: 'dana.mizrahi', points: '3',  status: 'IN_PROGRESS' },
  ]

  for (const t of tasks) {
    const task = await sdk.task.createTaskTask({
      connectionId,
      taskTask: {
        name: t.name,
        projectId: project.id,
        status: t.status as 'IN_PROGRESS' | 'COMPLETED' | 'OPENED',
        notes: `Points: ${t.points} | Assignee: ${t.assignee}`,
        tags: [t.assignee, `points:${t.points}`],
      },
    })
    const isBlocked = t.name.includes('DP-3')
    console.log(`[seed] ${name}: task "${t.name}" (${task.id}) — ${isBlocked ? 'BLOCKED' : t.status}`)
  }
}

// ── Seed repo (stale PRs with task-key labels for cross-linking) ──────────────
// Uses the GitHub connection so PRs appear when the app reads via GITHUB_ID.
// Labels include the task key (e.g. 'DP-1') so cross-linking works:
//   getPullRequests() falls back to pr.labels[0] as sourceBranch
//   → TASK_KEY_RE matches 'DP-1' → linkedTaskKey = 'DP-1'

const GITHUB_CONNECTION_ID = process.env.UNIFIED_GITHUB_CONNECTION_ID ?? ''

async function seedRepoPlatform(connectionId: string) {
  if (!connectionId) {
    console.log('[seed] Skipping PR seed — no GitHub connection ID set')
    return
  }
  console.log(`[seed] Seeding PRs via GitHub connection (${connectionId})…`)

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000)
  const oneDayAgo    = new Date(Date.now() - 1 * 24 * 3600 * 1000)

  const prs = [
    // Stale PR for DP-1 (auth refactor) — open 3+ days
    { labels: ['DP-1', 'feat'], status: 'PENDING' as const, createdAt: threeDaysAgo },
    // Rejected PR for DP-2 (payment fix) — recent
    { labels: ['DP-2', 'fix'],  status: 'REJECTED' as const, createdAt: oneDayAgo },
    // Open PR for DP-3 (mobile bug) — recent
    { labels: ['DP-3', 'feat'], status: 'PENDING' as const, createdAt: oneDayAgo },
  ]

  for (const p of prs) {
    const pr = await sdk.repo.createRepoPullrequest({
      connectionId,
      repoPullrequest: {
        status:    p.status,
        createdAt: p.createdAt,
        labels:    p.labels,
      },
    })
    console.log(`[seed] PR created [${p.labels[0]}] (${p.status}) → ${pr.id}`)
  }
}

// ── Seed messaging platforms ──────────────────────────────────────────────────

async function seedMessagingPlatform(name: string, connectionId: string) {
  if (!connectionId) {
    console.log(`[seed] Skipping ${name} messaging — no connection ID`)
    return
  }
  console.log(`[seed] Seeding ${name} alerts (${connectionId})…`)

  const messages = [
    '🚨 *Sprint Alert*: Sprint 24 at 62% with 3 days remaining — 4 tasks are blocked.',
    '⚠️ *Burnout Signal*: noa.levi has committed past 23:00 for 4 consecutive nights.',
    '🔴 *Stale PR*: PR by noa.levi (feat: auth service) open 3+ days without review.',
  ]

  for (const text of messages) {
    await sdk.message.createMessagingMessage({
      connectionId,
      messagingMessage: { message: text },
    })
  }
  console.log(`[seed] ${name}: ${messages.length} alert messages seeded`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[seed] Starting Unified.to sandbox seed…\n')

  // Seed all task platforms in parallel
  await Promise.all(
    TASK_PLATFORMS.map(p => seedTaskPlatform(p.name, p.connectionId))
  )

  // Seed repo data via GitHub connection (so app reads cross-linked PRs correctly)
  await seedRepoPlatform(GITHUB_CONNECTION_ID)

  // Seed messaging platforms in parallel
  await Promise.all(
    MSG_PLATFORMS.map(p => seedMessagingPlatform(p.name, p.connectionId))
  )

  console.log('\n[seed] All platforms seeded successfully ✓')
}

main().catch(e => {
  console.error('[seed] Seed failed:', e)
  process.exit(1)
})
