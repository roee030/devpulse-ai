/**
 * DevPulse Copilot Agent — port 9339
 *
 * Receives token-usage events from any Copilot client:
 *   - browser extension  (GitHub.com Copilot Chat, VS Code Web)
 *   - HTTPS proxy        (VS Code Desktop, WebStorm, any IDE)
 *   - manual CLI/hook    (curl, IDE task runner)
 *
 * Associates each event with a Jira task via git branch name.
 * Syncs to Firebase so the DevPulse dashboard can display AI effort per task.
 *
 * Run:  npx tsx agent/devpulse-agent.ts
 */

import http from 'node:http'
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// ── Config ─────────────────────────────────────────────────────────────────────

const PORT        = 9339
const LOG_FILE    = join(process.cwd(), '.devpulse-ai-effort.json')
const TASK_REGEX  = /([A-Z][A-Z0-9_]+-\d+)/   // Jira-style: PROJ-123, DEV-42

// ── Types ──────────────────────────────────────────────────────────────────────

export interface CopilotEvent {
  id:               string
  timestamp:        string
  branch:           string
  taskId:           string | null   // extracted from branch name
  promptTokens:     number
  completionTokens: number
  totalTokens:      number
  model:            string
  source:           'browser-extension' | 'https-proxy' | 'manual' | 'vscode-extension'
  file?:            string
  user?:            string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function getGitBranch(): string {
  const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8', cwd: process.cwd(),
  })
  return r.status === 0 ? r.stdout.trim() : 'unknown'
}

function getGitUser(): string {
  const r = spawnSync('git', ['config', 'user.email'], { encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : 'unknown'
}

function extractTaskId(branch: string): string | null {
  const m = branch.match(TASK_REGEX)
  return m ? m[1] : null
}

function loadLog(): CopilotEvent[] {
  if (!existsSync(LOG_FILE)) return []
  try {
    return JSON.parse(readFileSync(LOG_FILE, 'utf8'))
  } catch {
    return []
  }
}

function saveLog(events: CopilotEvent[]): void {
  writeFileSync(LOG_FILE, JSON.stringify(events, null, 2), 'utf8')
}

function summary(events: CopilotEvent[]) {
  const byTask = new Map<string, { tokens: number; events: number }>()
  for (const e of events) {
    const key = e.taskId ?? '(unattributed)'
    const prev = byTask.get(key) ?? { tokens: 0, events: 0 }
    byTask.set(key, { tokens: prev.tokens + e.totalTokens, events: prev.events + 1 })
  }
  return Object.fromEntries(byTask)
}

// ── HTTP Server ────────────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS for browser extension and dev tools
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // ── POST /log — receive a token-usage event ──────────────────────────────────
  if (req.method === 'POST' && req.url === '/log') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const payload = JSON.parse(body) as Partial<CopilotEvent>

        const branch = payload.branch ?? getGitBranch()
        const event: CopilotEvent = {
          id:               crypto.randomUUID(),
          timestamp:        new Date().toISOString(),
          branch,
          taskId:           payload.taskId ?? extractTaskId(branch),
          promptTokens:     payload.promptTokens     ?? 0,
          completionTokens: payload.completionTokens ?? 0,
          totalTokens:      payload.totalTokens      ?? (payload.promptTokens ?? 0) + (payload.completionTokens ?? 0),
          model:            payload.model  ?? 'copilot',
          source:           payload.source ?? 'manual',
          file:             payload.file,
          user:             payload.user ?? getGitUser(),
        }

        const events = loadLog()
        events.push(event)
        saveLog(events)

        const label = event.taskId ? `[${event.taskId}]` : '[unattributed]'
        console.log(`+${event.totalTokens} tokens ${label}  (${event.source}, ${branch})`)

        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: true, event }))
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: String(e) }))
      }
    })
    return
  }

  // ── GET /status — current branch + today's token count ──────────────────────
  if (req.method === 'GET' && req.url === '/status') {
    const branch  = getGitBranch()
    const taskId  = extractTaskId(branch)
    const events  = loadLog()
    const today   = new Date().toISOString().slice(0, 10)
    const todayEvents = events.filter(e => e.timestamp.startsWith(today))
    const todayTokens = todayEvents.reduce((s, e) => s + e.totalTokens, 0)

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      ok: true,
      branch,
      taskId,
      todayTokens,
      todayEvents: todayEvents.length,
      summary: summary(events),
    }))
    return
  }

  // ── GET /events — full log ───────────────────────────────────────────────────
  if (req.method === 'GET' && req.url === '/events') {
    const events = loadLog()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, events, summary: summary(events) }))
    return
  }

  // ── GET /summary — aggregated per task ──────────────────────────────────────
  if (req.method === 'GET' && req.url === '/summary') {
    const events = loadLog()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, summary: summary(events) }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ ok: false, error: 'Not found' }))
})

server.listen(PORT, '127.0.0.1', () => {
  const branch = getGitBranch()
  const taskId = extractTaskId(branch)
  console.log(`
╔═══════════════════════════════════════════╗
║  DevPulse Copilot Agent  :${PORT}          ║
╚═══════════════════════════════════════════╝
  Branch : ${branch}
  Task   : ${taskId ?? '(not on a task branch)'}
  Log    : ${LOG_FILE}

  POST http://localhost:${PORT}/log   { totalTokens, source, model? }
  GET  http://localhost:${PORT}/status
  GET  http://localhost:${PORT}/summary
`)
})
