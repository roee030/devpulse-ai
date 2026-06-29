// scripts/seed-sandbox.ts
// Populates mock API sandboxes with known test data.
// Usage: npx ts-node scripts/seed-sandbox.ts

const JIRA_BASE    = process.env.JIRA_SANDBOX_URL    ?? 'http://localhost:8080/jira'
const GITHUB_BASE  = process.env.GITHUB_SANDBOX_URL  ?? 'http://localhost:8080/github'
const SLACK_BASE   = process.env.SLACK_SANDBOX_URL   ?? 'http://localhost:8080/slack'
const JIRA_TOKEN   = process.env.JIRA_API_TOKEN       ?? 'test-token'
const GITHUB_TOKEN = process.env.GITHUB_API_TOKEN     ?? 'test-token'
const SLACK_TOKEN  = process.env.SLACK_API_TOKEN      ?? 'test-token'

async function post(url: string, token: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`POST ${url} failed ${res.status}: ${text}`)
  }
  return res.json()
}

// ── Jira sandbox ─────────────────────────────────────────────────────────────

async function seedJira() {
  console.log('[seed] Seeding Jira sandbox…')

  // 1 sprint, 84 story points total
  const sprint = await post(`${JIRA_BASE}/sprint`, JIRA_TOKEN, {
    name: 'Sprint 24',
    startDate: '2025-06-01',
    endDate: '2025-06-14',
    totalPoints: 84,
  })

  const tasks = [
    { title: 'Implement payment gateway',   assignee: 'tom.levi',  points: 13, status: 'blocked',     blocker: 'API keys not provisioned' },
    { title: 'Design mobile auth flow',     assignee: 'noa.levi',  points: 8,  status: 'in-progress', blocker: null },
    { title: 'Backend user service refactor', assignee: 'alice.chen', points: 5, status: 'done',       blocker: null },
    { title: 'Set up CI pipeline',          assignee: 'david.kim', points: 3,  status: 'todo',        blocker: null },
    { title: 'Fix authentication bug',      assignee: 'sara.cohen', points: 5, status: 'in-progress', blocker: null },
    { title: 'Write API documentation',     assignee: 'tom.levi',  points: 2,  status: 'blocked',     blocker: 'Waiting on backend spec' },
    { title: 'Performance optimization',    assignee: 'noa.levi',  points: 8,  status: 'todo',        blocker: null },
    { title: 'Database migration scripts',  assignee: 'david.kim', points: 5,  status: 'in-progress', blocker: null },
  ]

  for (const task of tasks) {
    await post(`${JIRA_BASE}/task`, JIRA_TOKEN, { ...task, sprintId: sprint.id })
  }

  console.log(`[seed] Jira: 1 sprint (${sprint.id}), ${tasks.length} tasks seeded`)
}

// ── GitHub sandbox ────────────────────────────────────────────────────────────

async function seedGitHub() {
  console.log('[seed] Seeding GitHub sandbox…')

  const prs = [
    {
      number: 247,
      title: 'feat: add payment gateway integration',
      author: 'tom.levi',
      status: 'open',
      createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(), // stale 26h
      reviewers: ['alice.chen'],
    },
    {
      number: 248,
      title: 'fix: resolve mobile auth redirect loop',
      author: 'noa.levi',
      status: 'open',
      createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
      reviewers: ['david.kim'],
    },
    {
      number: 246,
      title: 'refactor: user service layer',
      author: 'alice.chen',
      status: 'approved',
      createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
      reviewers: ['sara.cohen'],
    },
  ]

  for (const pr of prs) {
    await post(`${GITHUB_BASE}/pull-request`, GITHUB_TOKEN, pr)
  }

  // Late-night commits (between 23:00–03:00) by noa.levi
  const lateCommits = [
    { author: 'noa.levi', message: 'wip: mobile auth progress', time: '23:45' },
    { author: 'noa.levi', message: 'fix: token refresh logic',  time: '01:20' },
    { author: 'noa.levi', message: 'debug: session persistence', time: '02:50' },
  ]

  for (const commit of lateCommits) {
    const ts = new Date()
    const [h, m] = commit.time.split(':').map(Number)
    ts.setHours(h, m, 0, 0)
    await post(`${GITHUB_BASE}/commit`, GITHUB_TOKEN, { ...commit, timestamp: ts.toISOString() })
  }

  console.log(`[seed] GitHub: ${prs.length} PRs, ${lateCommits.length} late-night commits seeded`)
}

// ── Slack sandbox ─────────────────────────────────────────────────────────────

async function seedSlack() {
  console.log('[seed] Seeding Slack sandbox…')

  const messages = [
    {
      channel: '#dev-alerts',
      text: '🚨 *Sprint Alert*: Sprint 24 is 62% complete with 3 days remaining. 4 tasks are blocked.',
      timestamp: new Date().toISOString(),
    },
    {
      channel: '#dev-alerts',
      text: '⚠️ *Burnout Signal*: Tom Levi has been active past midnight 3 nights this week. Consider a check-in.',
      timestamp: new Date().toISOString(),
    },
    {
      channel: '#dev-alerts',
      text: '🔴 *Stale PR*: PR #247 by tom.levi has been open for 26+ hours without review.',
      timestamp: new Date().toISOString(),
    },
  ]

  for (const msg of messages) {
    await post(`${SLACK_BASE}/message`, SLACK_TOKEN, msg)
  }

  console.log(`[seed] Slack: ${messages.length} messages seeded`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[seed] Starting sandbox seed…')
  try {
    await Promise.all([seedJira(), seedGitHub(), seedSlack()])
    console.log('[seed] All sandboxes seeded successfully ✓')
  } catch (e) {
    console.error('[seed] Seed failed:', e)
    process.exit(1)
  }
}

main()
