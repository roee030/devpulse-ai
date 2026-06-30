// src/lib/dailyBriefing.ts
// Generates a daily standup text from real cross-linked data and
// posts it to Slack/Teams via the Unified.to messaging API.
import type { EnrichedTask } from '../context/UnifiedDataContext'
import type { Developer } from '../data/mockData'
import { postMessage } from './unified'

// ── Text generation ───────────────────────────────────────────────────────────

function pad(n: number): string { return String(n).padStart(2, '0') }

function todayLabel(): string {
  const d = new Date()
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`
}

function statusEmoji(s: string): string {
  if (s === 'done')        return '✅'
  if (s === 'in-progress') return '🔄'
  if (s === 'blocked')     return '🚫'
  return '📋'
}

function prStatusEmoji(s: string): string {
  if (s === 'merged') return '✅'
  if (s === 'approved') return '👍'
  if (s === 'changes-requested') return '🔁'
  if (s === 'open') return '🔓'
  return '⏳'
}

export interface DeveloperBriefing {
  developer: Developer
  inProgress: EnrichedTask[]
  done:       EnrichedTask[]
  blocked:    EnrichedTask[]
}

export function generateDeveloperSection(dev: Developer, tasks: EnrichedTask[]): DeveloperBriefing {
  const myTasks = tasks.filter(t =>
    t.assigneeDev?.id === dev.id ||
    normName(t.assigneeName ?? '') === normName(dev.name)
  )
  return {
    developer:  dev,
    inProgress: myTasks.filter(t => t.status === 'in-progress'),
    done:       myTasks.filter(t => t.status === 'done'),
    blocked:    myTasks.filter(t => t.status === 'blocked'),
  }
}

function normName(n: string): string {
  return n.toLowerCase().replace(/[^a-z]/g, '')
}

function formatHours(h: number): string {
  if (h < 1) return '<1h'
  if (h < 24) return `${h}h`
  return `${Math.round(h / 24)}d`
}

export function generateSlackText(
  developers: Developer[],
  tasks:      EnrichedTask[],
  role:       string = 'teamLead',
): string {
  const date     = todayLabel()
  const allBlocked = tasks.filter(t => t.isBlocked)
  const stalePRs   = tasks
    .flatMap(t => t.prs.filter(p => p.status === 'open' && p.waitingHours > 24))
    .sort((a, b) => b.waitingHours - a.waitingHours)

  const lines: string[] = [
    `📊 *DevPulse Daily Standup — ${date}*`,
    '─────────────────────────────',
  ]

  // Per-developer section
  const devSections = developers.slice(0, role === 'cto' ? 50 : 15).map(dev => {
    const b = generateDeveloperSection(dev, tasks)
    const parts: string[] = []

    if (b.blocked.length > 0) {
      parts.push(...b.blocked.map(t =>
        `    🚫 *${t.key}* — ${t.title.slice(0, 60)} _(blocked ${t.daysOpen}d)_`
      ))
    }
    if (b.inProgress.length > 0) {
      parts.push(...b.inProgress.slice(0, 3).map(t => {
        const prInfo = t.prs.length > 0
          ? ` · PR #${t.prs[0].number} ${prStatusEmoji(t.prs[0].status)} ${formatHours(t.prs[0].waitingHours)}`
          : ''
        return `    🔄 *${t.key}* — ${t.title.slice(0, 60)}${prInfo}`
      }))
    }
    if (b.done.length > 0) {
      parts.push(...b.done.slice(0, 2).map(t =>
        `    ✅ *${t.key}* — ${t.title.slice(0, 60)}`
      ))
    }

    if (parts.length === 0) return null

    const firstName = (dev.name ?? 'Dev').split(' ')[0]
    return [`*${firstName}* (${dev.role})`, ...parts].join('\n')
  }).filter(Boolean)

  if (devSections.length > 0) {
    lines.push(...devSections as string[])
  } else {
    lines.push('_No task data available yet — connect Jira/Linear/Monday in Integrations_')
  }

  // Blockers summary
  if (allBlocked.length > 0) {
    lines.push('')
    lines.push('─────────────────────────────')
    lines.push(`🚨 *${allBlocked.length} Blocked Task${allBlocked.length !== 1 ? 's' : ''}*`)
    lines.push(...allBlocked.slice(0, 5).map(t =>
      `  • *${t.key}* — ${t.title.slice(0, 70)}${t.assigneeDev ? ` _(${t.assigneeDev.name})_` : ''}`
    ))
  }

  // Stale PRs summary
  if (stalePRs.length > 0) {
    lines.push('')
    lines.push(`⏰ *${stalePRs.length} PR${stalePRs.length !== 1 ? 's' : ''} waiting >24h*`)
    lines.push(...stalePRs.slice(0, 5).map(pr =>
      `  • PR #${pr.number} — ${pr.title.slice(0, 60)} _(${formatHours(pr.waitingHours)})_`
    ))
  }

  lines.push('')
  lines.push(`_Sent by DevPulse AI · ${pad(new Date().getHours())}:${pad(new Date().getMinutes())}_`)

  return lines.join('\n')
}

// ── Markdown format (for in-app display) ─────────────────────────────────────

export function generateMarkdownBriefing(
  developers: Developer[],
  tasks:      EnrichedTask[],
): string {
  const sections: string[] = [`## Daily Standup — ${todayLabel()}\n`]

  for (const dev of developers) {
    const b = generateDeveloperSection(dev, tasks)
    if (b.inProgress.length + b.done.length + b.blocked.length === 0) continue

    sections.push(`### ${dev.name ?? 'Developer'} · *${dev.role}*`)

    for (const t of b.blocked) {
      sections.push(`${statusEmoji(t.status)} **${t.key}** ${t.title} — *blocked ${t.daysOpen}d*`)
    }
    for (const t of b.inProgress) {
      const prLine = t.prs.length > 0
        ? ` · PR #${t.prs[0].number} ${prStatusEmoji(t.prs[0].status)} ${formatHours(t.prs[0].waitingHours)}`
        : ''
      sections.push(`${statusEmoji(t.status)} **${t.key}** ${t.title}${prLine}`)
    }
    for (const t of b.done.slice(0, 2)) {
      sections.push(`${statusEmoji(t.status)} **${t.key}** ${t.title}`)
    }
    sections.push('')
  }

  return sections.join('\n')
}

// ── Post to Slack / Teams ─────────────────────────────────────────────────────

export interface PostBriefingOptions {
  connectionId: string      // Slack or Teams connection ID
  channelId:    string      // channel to post in
  developers:   Developer[]
  tasks:        EnrichedTask[]
  role?:        string
}

export async function postDailyBriefing(opts: PostBriefingOptions): Promise<boolean> {
  const text = generateSlackText(opts.developers, opts.tasks, opts.role)
  return postMessage(opts.connectionId, opts.channelId, text)
}
