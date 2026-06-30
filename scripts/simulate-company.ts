// scripts/simulate-company.ts
// Simulates 14 days of real company activity via Unified.to SDK.
// Usage:
//   npx tsx scripts/simulate-company.ts            # real API calls
//   npx tsx scripts/simulate-company.ts --dry-run  # logs only
import { UnifiedTo } from '@unified-api/typescript-sdk'

const DRY_RUN = process.argv.includes('--dry-run')
const UNIFIED_API_KEY = process.env.UNIFIED_API_KEY ?? ''

if (!UNIFIED_API_KEY && !DRY_RUN) {
  console.warn('[sim] WARNING: UNIFIED_API_KEY not set — API calls will fail auth. Use --dry-run for local testing.')
}

const sdk = DRY_RUN ? null : new UnifiedTo({ security: { jwt: UNIFIED_API_KEY } })

// ── Connection IDs ────────────────────────────────────────────────────────────
const JIRA_CONN   = process.env.UNIFIED_JIRA_CONNECTION_ID    ?? ''
const GITHUB_CONN = process.env.UNIFIED_GITHUB_CONNECTION_ID  ?? ''
const SLACK_CONN  = process.env.UNIFIED_SLACK_CONNECTION_ID   ?? ''

// ── Team definitions ──────────────────────────────────────────────────────────
interface TeamMember {
  id: string
  name: string
  role: string
  pattern: 'healthy' | 'burnout' | 'struggling'
  jiraAccountId: string
  githubLogin: string
  slackId: string
}

const TEAM: TeamMember[] = [
  {
    id: 'lior.ben-david',
    name: 'Lior Ben-David',
    role: 'cto',
    pattern: 'healthy',
    jiraAccountId: process.env.SIM_JIRA_USER_CTO ?? '',
    githubLogin:   process.env.SIM_GITHUB_USER_CTO ?? '',
    slackId:       process.env.SIM_SLACK_USER_CTO ?? '',
  },
  {
    id: 'maya.cohen',
    name: 'Maya Cohen',
    role: 'division-head',
    pattern: 'healthy',
    jiraAccountId: process.env.SIM_JIRA_USER_DIV ?? '',
    githubLogin:   process.env.SIM_GITHUB_USER_DIV ?? '',
    slackId:       process.env.SIM_SLACK_USER_DIV ?? '',
  },
  {
    id: 'avi.shapiro',
    name: 'Avi Shapiro',
    role: 'team-lead',
    pattern: 'healthy',
    jiraAccountId: process.env.SIM_JIRA_USER_LEAD ?? '',
    githubLogin:   process.env.SIM_GITHUB_USER_LEAD ?? '',
    slackId:       process.env.SIM_SLACK_USER_LEAD ?? '',
  },
  {
    id: 'noa.levi',
    name: 'Noa Levi',
    role: 'developer',
    pattern: 'healthy',
    jiraAccountId: process.env.SIM_JIRA_USER_DEV1 ?? '',
    githubLogin:   process.env.SIM_GITHUB_USER_DEV1 ?? '',
    slackId:       process.env.SIM_SLACK_USER_DEV1 ?? '',
  },
  {
    id: 'tom.levi',
    name: 'Tom Levi',
    role: 'developer',
    pattern: 'burnout',
    jiraAccountId: process.env.SIM_JIRA_USER_DEV2 ?? '',
    githubLogin:   process.env.SIM_GITHUB_USER_DEV2 ?? '',
    slackId:       process.env.SIM_SLACK_USER_DEV2 ?? '',
  },
  {
    id: 'dana.mizrahi',
    name: 'Dana Mizrahi',
    role: 'developer',
    pattern: 'struggling',
    jiraAccountId: process.env.SIM_JIRA_USER_DEV3 ?? '',
    githubLogin:   process.env.SIM_GITHUB_USER_DEV3 ?? '',
    slackId:       process.env.SIM_SLACK_USER_DEV3 ?? '',
  },
]

const byId = (id: string) => TEAM.find(m => m.id === id)!

// ── Simulation state (tracks IDs created during this run) ────────────────────
const state = {
  projectId: '',
  taskIds: {} as Record<string, string>,  // 'DP-1' → actual Unified ID
  prIds: {} as Record<string, string>,    // 'noa-pr-1' → actual Unified ID
  repoId: 'sim-repo-devpulse',            // stable string used for commits
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(`[sim] ${msg}`)
}

function randomHour(from: number, to: number): Date {
  const now = new Date()
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Handle overnight ranges (e.g., 22–2 → 22:xx or 0:xx to 2:xx)
  const h = to < from
    ? (Math.random() < 0.5 ? from + Math.random() * (24 - from) : Math.random() * to)
    : from + Math.random() * (to - from)
  base.setHours(Math.floor(h), Math.floor(Math.random() * 60), 0, 0)
  return base
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// ── Jira operations ───────────────────────────────────────────────────────────

async function createSprint(name: string, totalPoints: number) {
  if (!JIRA_CONN && !DRY_RUN) { log(`[skip] No Jira connection — skipping sprint creation`); return }

  // Idempotency: check if project with this name already exists
  if (!DRY_RUN && sdk) {
    try {
      const existing = await sdk.task.listTaskProjects({ connectionId: JIRA_CONN })
      const found = existing.find(p => p.name === name)
      if (found) {
        state.projectId = found.id ?? ''
        log(`Sprint project already exists: "${name}" (${state.projectId}) — skipping`)
        return
      }
    } catch { /* list failed — proceed to create */ }

    const project = await sdk.task.createTaskProject({
      connectionId: JIRA_CONN,
      taskProject: { name },
    })
    state.projectId = project.id ?? ''
  }

  log(`Sprint project created: "${name}" (${totalPoints} pts)`)
}

async function createTasks(tasks: Array<{
  key: string
  summary: string
  points: number
  assignee: string
  status: string
}>) {
  if (!JIRA_CONN && !DRY_RUN) { log('[skip] No Jira connection — skipping task creation'); return }

  for (const t of tasks) {
    const member = byId(t.assignee)
    if (!DRY_RUN && sdk) {
      try {
        const existing = await sdk.task.listTaskTasks({ connectionId: JIRA_CONN })
        const found = existing.find(t2 => t2.name?.startsWith(t.key + ':'))
        if (found) {
          state.taskIds[t.key] = found.id ?? ''
          log(`Task ${t.key} already exists (${found.id}) — skipping`)
          continue
        }
      } catch { /* proceed */ }

      const created = await sdk.task.createTaskTask({
        connectionId: JIRA_CONN,
        taskTask: {
          name: `${t.key}: ${t.summary}`,
          projectId: state.projectId || undefined,
          status: t.status === 'In Progress' ? 'IN_PROGRESS' : t.status === 'Done' ? 'COMPLETED' : 'OPENED',
          notes: `Story points: ${t.points}`,
          tags: [t.assignee, `points:${t.points}`, t.key],
          assignedUserIds: member.jiraAccountId ? [member.jiraAccountId] : undefined,
        },
      })
      state.taskIds[t.key] = created.id ?? ''
    }
    log(`Task created: ${t.key} "${t.summary}" → ${t.assignee} (${t.points}pts, ${t.status})`)
  }
}

async function progressTask(assigneeId: string, taskKey: string, pointsDelta: number) {
  const taskId = state.taskIds[taskKey]
  if (!taskId && !DRY_RUN) return
  if (!JIRA_CONN && !DRY_RUN) return
  if (!DRY_RUN && sdk) {
    await sdk.task.patchTaskTask({
      connectionId: JIRA_CONN,
      taskTask: {
        id: taskId,
        notes: `Progress +${pointsDelta}pts by ${assigneeId}`,
        status: 'IN_PROGRESS',
      },
    }).catch(() => { /* non-fatal */ })
  }
  log(`Task ${taskKey} progressed (+${pointsDelta}pts) by ${assigneeId}`)
}

async function transitionTask(taskKey: string, newStatus: string) {
  const taskId = state.taskIds[taskKey]
  if (!taskId && !DRY_RUN) return
  if (!JIRA_CONN && !DRY_RUN) return
  const sdkStatus = newStatus === 'In Review' ? 'IN_PROGRESS' : newStatus === 'Done' ? 'COMPLETED' : 'OPENED'
  if (!DRY_RUN && sdk) {
    await sdk.task.patchTaskTask({
      connectionId: JIRA_CONN,
      taskTask: { id: taskId, status: sdkStatus },
    }).catch(() => { /* non-fatal */ })
  }
  log(`Task ${taskKey} → ${newStatus}`)
}

async function reopenTask(taskKey: string, reason: string) {
  const taskId = state.taskIds[taskKey]
  if (!taskId && !DRY_RUN) return
  if (!JIRA_CONN && !DRY_RUN) return
  if (!DRY_RUN && sdk) {
    await sdk.task.patchTaskTask({
      connectionId: JIRA_CONN,
      taskTask: { id: taskId, status: 'OPENED', notes: `Reopened: ${reason}` },
    }).catch(() => { /* non-fatal */ })
  }
  log(`Task ${taskKey} reopened: "${reason}"`)
}

async function logAIQuery(devId: string, day: number, info: { credits: number; module: string; taskKey: string }) {
  const taskId = state.taskIds[info.taskKey]
  if (!taskId && !DRY_RUN) return
  if (!JIRA_CONN && !DRY_RUN) return
  if (!DRY_RUN && sdk) {
    await sdk.task.patchTaskTask({
      connectionId: JIRA_CONN,
      taskTask: {
        id: taskId,
        notes: `[AI Usage] Day ${day} — ${devId}: ${info.credits} credits on ${info.module}`,
      },
    }).catch(() => { /* non-fatal */ })
  }
  log(`AI usage logged: ${devId} used ${info.credits} credits on ${info.module} (day ${day})`)
}

// ── GitHub / Repo operations ──────────────────────────────────────────────────

async function createCommit(devId: string, timestamp: Date, message: string) {
  if (!GITHUB_CONN && !DRY_RUN) return
  if (!DRY_RUN && sdk) {
    await sdk.repo.createRepoCommit({
      connectionId: GITHUB_CONN,
      repoCommit: {
        repoId: state.repoId,
        message,
        userId: byId(devId).githubLogin || devId,
        createdAt: timestamp,
      },
    }).catch(() => { /* non-fatal: sandbox may not support commit creation */ })
  }
  const h = timestamp.getHours().toString().padStart(2, '0')
  const m = timestamp.getMinutes().toString().padStart(2, '0')
  log(`Commit by ${devId} at ${h}:${m} — "${message}"`)
}

async function openPR(devId: string, taskKey: string, title: string, reviewers?: string[]) {
  if (!GITHUB_CONN && !DRY_RUN) return
  const prKey = `${devId.replace('.', '-')}-pr-${Object.keys(state.prIds).length + 1}`
  if (!DRY_RUN && sdk) {
    const pr = await sdk.repo.createRepoPullrequest({
      connectionId: GITHUB_CONN,
      repoPullrequest: {
        status: 'PENDING',
        userIds: [byId(devId).githubLogin || devId, ...(reviewers?.map(r => byId(r).githubLogin || r) ?? [])],
        labels: [taskKey, devId],
        createdAt: new Date(),
      },
    }).catch(() => ({ id: undefined }))
    if (pr.id) state.prIds[prKey] = pr.id
  } else {
    state.prIds[prKey] = `dry-run-${prKey}`
  }
  log(`PR opened: "${title}" by ${devId} (key: ${prKey})`)
  return prKey
}

async function rejectPR(prKey: string, reason: string) {
  const prId = state.prIds[prKey]
  if (!prId && !DRY_RUN) return
  if (!GITHUB_CONN && !DRY_RUN) return
  if (!DRY_RUN && sdk) {
    await sdk.repo.patchRepoPullrequest({
      connectionId: GITHUB_CONN,
      repoPullrequest: { id: prId, status: 'REJECTED', labels: [`rejected: ${reason}`] },
    }).catch(() => { /* non-fatal */ })
  }
  log(`PR ${prKey} rejected: "${reason}"`)
}

async function approvePR(prKey: string, reviewerId: string) {
  const prId = state.prIds[prKey]
  if (!prId && !DRY_RUN) return
  if (!GITHUB_CONN && !DRY_RUN) return
  if (!DRY_RUN && sdk) {
    await sdk.repo.patchRepoPullrequest({
      connectionId: GITHUB_CONN,
      repoPullrequest: { id: prId, status: 'APPROVED' },
    }).catch(() => { /* non-fatal */ })
  }
  log(`PR ${prKey} approved by ${reviewerId}`)
}

// ── Slack operations ──────────────────────────────────────────────────────────

async function postMessage(devId: string, channel: string, text: string) {
  if (!SLACK_CONN && !DRY_RUN) return
  if (!DRY_RUN && sdk) {
    await sdk.message.createMessagingMessage({
      connectionId: SLACK_CONN,
      messagingMessage: {
        message: `[${channel}] ${byId(devId).name}: ${text}`,
      },
    }).catch(() => { /* non-fatal */ })
  }
  log(`Slack [${channel}] ${devId}: "${text.slice(0, 60)}..."`)
}

// ── Day-by-day simulation ─────────────────────────────────────────────────────

const SPRINT_TASKS = [
  { key: 'DP-1',  summary: 'Auth Service Refactor',    points: 8,  assignee: 'noa.levi',    status: 'In Progress' },
  { key: 'DP-2',  summary: 'Payment Module Fix',        points: 13, assignee: 'tom.levi',   status: 'To Do' },
  { key: 'DP-3',  summary: 'UI Component Library',      points: 5,  assignee: 'dana.mizrahi', status: 'To Do' },
  { key: 'DP-4',  summary: 'API Gateway Optimization',  points: 8,  assignee: 'noa.levi',   status: 'To Do' },
  { key: 'DP-5',  summary: 'Database Migration Script', points: 5,  assignee: 'dana.mizrahi', status: 'To Do' },
  { key: 'DP-6',  summary: 'Mobile Auth Flow',          points: 13, assignee: 'tom.levi',   status: 'To Do' },
  { key: 'DP-7',  summary: 'Security Audit Fixes',      points: 8,  assignee: 'avi.shapiro', status: 'To Do' },
  { key: 'DP-8',  summary: 'Performance Monitoring',    points: 5,  assignee: 'noa.levi',   status: 'To Do' },
  { key: 'DP-9',  summary: 'CI/CD Pipeline Update',     points: 5,  assignee: 'dana.mizrahi', status: 'To Do' },
  { key: 'DP-10', summary: 'Documentation Update',      points: 3,  assignee: 'avi.shapiro', status: 'To Do' },
  { key: 'DP-11', summary: 'Load Testing',              points: 5,  assignee: 'tom.levi',   status: 'To Do' },
  { key: 'DP-12', summary: 'Code Review Backlog',       points: 6,  assignee: 'avi.shapiro', status: 'To Do' },
]

const noaPrKey = { current: '' }
const tomPr1Key = { current: '' }
const tomPr2Key = { current: '' }

async function simulateDay(day: number) {
  log(`\n── Day ${day} ──────────────────────────────────────────────────`)

  // ── Day 1: Sprint kickoff ────────────────────────────────────────────────────
  if (day === 1) {
    await createSprint('Sprint 24 – Auth Refactor & Payment', 84)
    await createTasks(SPRINT_TASKS)
  }

  // ── Healthy developers (noa.levi, avi.shapiro) ───────────────────────────────
  if (day >= 2) {
    const pickTask = pickRandom(['DP-1', 'DP-4', 'DP-7', 'DP-8', 'DP-10'])
    await progressTask('noa.levi', pickTask, 2)
    await createCommit('noa.levi', randomHour(9, 18), `feat: progress on sprint tasks [${pickTask}]`)

    if (day % 2 === 0) {
      await progressTask('avi.shapiro', pickRandom(['DP-7', 'DP-10', 'DP-12']), 1)
      await createCommit('avi.shapiro', randomHour(9, 17), `chore: security fixes and review [DP-7]`)
    }
  }

  // ── noa.levi: opens PR day 3, approved day 8 (stale → triggers alert) ────────
  if (day === 3) {
    noaPrKey.current = (await openPR('noa.levi', 'DP-1', 'feat: auth service refactor - ready for review', ['avi.shapiro'])) ?? ''
  }
  if (day === 8 && noaPrKey.current) {
    await approvePR(noaPrKey.current, 'avi.shapiro')
    log(`⚠️  Stale PR detected: noa.levi PR open for 5 days before review`)
  }

  // ── tom.levi: burnout pattern ────────────────────────────────────────────────
  if (day <= 4) {
    await progressTask('tom.levi', 'DP-2', 1)
    await createCommit('tom.levi', randomHour(10, 18), 'feat: payment module initial work')
  } else {
    // Days 5-14: late nights, no Jira progress
    await createCommit('tom.levi', randomHour(22, 24), `fix: payment module attempt ${day} - still broken`)
    await createCommit('tom.levi', randomHour(23, 2),  `debug: adding logs to payment service`)
    if (day > 7) {
      await createCommit('tom.levi', randomHour(1, 3), `chore: trying different approach on payment`)
    }
    if (day === 6) {
      tomPr1Key.current = (await openPR('tom.levi', 'DP-2', 'fix: payment module - first attempt')) ?? ''
    }
    if (day === 8 && tomPr1Key.current) {
      await rejectPR(tomPr1Key.current, 'Logic is incorrect, needs rethink')
      log(`🔴  Burnout signal growing: tom.levi PR rejected, no Jira progress`)
    }
    if (day === 10) {
      tomPr2Key.current = (await openPR('tom.levi', 'DP-2', 'fix: payment module - second attempt')) ?? ''
    }
    if (day === 12 && tomPr2Key.current) {
      await rejectPR(tomPr2Key.current, 'Still has the same race condition')
      log(`🔴  Burnout confirmed: tom.levi — 2 PR rejections, 7 late-night sessions`)
    }
  }

  // ── dana.mizrahi: struggling pattern ────────────────────────────────────────
  await createCommit('dana.mizrahi', randomHour(10, 17), `feat: working on UI components [DP-3]`)
  if (day === 4)  await transitionTask('DP-3', 'In Review')
  if (day === 5)  await reopenTask('DP-3', 'Accessibility issues found in review')
  if (day === 8)  await transitionTask('DP-3', 'In Review')
  if (day === 9)  await reopenTask('DP-3', 'Performance regression detected')
  if (day === 11) await transitionTask('DP-3', 'In Review')

  // High AI query usage for dana — logged as task notes
  if (day >= 3) {
    await logAIQuery('dana.mizrahi', day, {
      credits: pickRandom([800, 1200, 1500]),
      module: 'UI Components',
      taskKey: 'DP-3',
    })
  }

  // ── Slack messages ────────────────────────────────────────────────────────────
  if (day === 5) {
    await postMessage('tom.levi', '#backend-team',
      'יש לי בעיה עם ה-payment module, משהו לא עובד עם ה-race condition')
    await postMessage('avi.shapiro', '#backend-team',
      '@tom תפתח PR ונסתכל ביחד על הקוד')
  }
  if (day === 9) {
    await postMessage('tom.levi', '#backend-team',
      'עדיין תקוע, ניסיתי הכל. אפשר לעשות פגישה?')
    await postMessage('maya.cohen', '#engineering-leads',
      'נראה שיש בעיה עם ה-payment, צריך לשים עין')
  }
  if (day === 12) {
    await postMessage('dana.mizrahi', '#frontend-team',
      'ה-DP-3 חוזר לי שוב, performance regression בריצה')
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  log(`Starting ${DRY_RUN ? '[DRY RUN] ' : ''}company simulation — 14 days\n`)

  if (!JIRA_CONN && !DRY_RUN)  log('⚠️  UNIFIED_JIRA_CONNECTION_ID not set — Jira steps will be skipped')
  if (!SLACK_CONN && !DRY_RUN) log('⚠️  UNIFIED_SLACK_CONNECTION_ID not set — Slack steps will be skipped')

  for (let day = 1; day <= 14; day++) {
    await simulateDay(day)
  }

  log('\n── Simulation complete ✓')
  log('Expected signals:')
  log('  🔴 Burnout:    tom.levi — 7+ late-night sessions, 2 PR rejections, 0 Jira progress')
  log('  🟡 Stale PR:   noa.levi — PR open 5 days before review')
  log('  🟡 Struggling: dana.mizrahi — DP-3 reopened 2x, high AI usage')
  log('  🟡 Sprint:     predicted <70% completion (DP-2/DP-6 blocked by tom)')
}

main().catch(e => {
  console.error('[sim] Simulation failed:', e)
  process.exit(1)
})
