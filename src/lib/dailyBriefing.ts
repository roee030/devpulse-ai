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

// Group tasks by their assignee name (for when developer cross-links fail)
function groupTasksByAssignee(tasks: EnrichedTask[]): Map<string, EnrichedTask[]> {
  const map = new Map<string, EnrichedTask[]>()
  for (const t of tasks) {
    const key = t.assigneeDev?.name ?? t.assigneeName ?? 'Unassigned'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(t)
  }
  return map
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

  // Try developer-matched sections first
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
  } else if (tasks.length > 0) {
    // Fallback: group by task assignee name when developer cross-links don't exist
    // (typical with sandbox/demo connections that have no shared user identity)
    lines.push('*Sprint Task Summary*')
    const byAssignee = groupTasksByAssignee(tasks)
    let shown = 0
    for (const [name, assigneeTasks] of byAssignee) {
      if (shown >= 12) break
      const inProg  = assigneeTasks.filter(t => t.status === 'in-progress')
      const blocked = assigneeTasks.filter(t => t.isBlocked)
      const done    = assigneeTasks.filter(t => t.status === 'done')
      const parts: string[] = []
      blocked.forEach(t => parts.push(`    🚫 *${t.key}* — ${t.title.slice(0, 55)} _(blocked ${t.daysOpen}d)_`))
      inProg.slice(0, 2).forEach(t => parts.push(`    🔄 *${t.key}* — ${t.title.slice(0, 55)}`))
      done.slice(0, 1).forEach(t => parts.push(`    ✅ *${t.key}* — ${t.title.slice(0, 55)}`))
      if (parts.length > 0) {
        lines.push(`*${name.split(' ')[0]}*`)
        lines.push(...parts)
        shown++
      }
    }
    lines.push('')
    const todo = tasks.filter(t => t.status === 'todo').length
    const ip   = tasks.filter(t => t.status === 'in-progress').length
    const dn   = tasks.filter(t => t.status === 'done').length
    const bl   = tasks.filter(t => t.isBlocked).length
    lines.push(`_${tasks.length} total tasks: ${ip} in progress · ${dn} done · ${bl} blocked · ${todo} todo_`)
  } else {
    lines.push('_No task data available yet — connect Jira/Linear/Monday in Integrations_')
  }

  // Blockers summary
  if (allBlocked.length > 0) {
    lines.push('')
    lines.push('─────────────────────────────')
    lines.push(`🚨 *${allBlocked.length} Blocked Task${allBlocked.length !== 1 ? 's' : ''}*`)
    lines.push(...allBlocked.slice(0, 5).map(t =>
      `  • *${t.key}* — ${t.title.slice(0, 70)}${t.assigneeDev ? ` _(${t.assigneeDev.name})_` : t.assigneeName ? ` _(${t.assigneeName})_` : ''}`
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

  let matched = 0
  for (const dev of developers) {
    const b = generateDeveloperSection(dev, tasks)
    if (b.inProgress.length + b.done.length + b.blocked.length === 0) continue

    matched++
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

  // Fallback: when developer identity cross-linking isn't available, group by assignee name
  if (matched === 0 && tasks.length > 0) {
    sections.push('### Sprint Task Summary\n')
    const byAssignee = groupTasksByAssignee(tasks)
    for (const [name, assigneeTasks] of byAssignee) {
      sections.push(`**${name}**`)
      const blocked  = assigneeTasks.filter(t => t.isBlocked)
      const inProg   = assigneeTasks.filter(t => t.status === 'in-progress')
      const done     = assigneeTasks.filter(t => t.status === 'done')
      blocked.forEach(t  => sections.push(`${statusEmoji('blocked')} **${t.key}** ${t.title} — *blocked ${t.daysOpen}d*`))
      inProg.slice(0,3).forEach(t => sections.push(`${statusEmoji('in-progress')} **${t.key}** ${t.title}`))
      done.slice(0,1).forEach(t   => sections.push(`${statusEmoji('done')} **${t.key}** ${t.title}`))
      sections.push('')
    }
    const bl = tasks.filter(t => t.isBlocked).length
    const ip = tasks.filter(t => t.status === 'in-progress').length
    const dn = tasks.filter(t => t.status === 'done').length
    sections.push(`*${tasks.length} tasks total — ${ip} in progress · ${dn} done · ${bl} blocked*`)
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
