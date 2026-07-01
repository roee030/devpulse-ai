// src/lib/insights.ts
// Pure functions — no React, no hooks. Easy to unit-test.

interface TeamSummary {
  name: string
  healthScore: number
  stalePRs: number
  atRiskTasks: number
}

interface DevSummary {
  name?: string
  riskLevel: string
  teamId: string
  tasks: { status: string; title?: string }[]
  prStatus?: { waitingHours: number } | null
}

interface TeamRef {
  id: string
  name: string
}

function tokLabel(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

export function computeDashboardInsight(
  level: 'top' | 'division' | 'team',
  entityName: string,
  healthScore: number,
  teams: TeamSummary[],
  criticalDevCount: number,
  criticalDevNames?: string[],
): string {
  let text: string

  if (level === 'team') {
    const team = teams[0]
    if (!team) {
      text = `${entityName} team health is ${healthScore}/100.`
    } else {
      text =
        `${entityName} team health is ${healthScore}/100. ` +
        `The team has ${team.stalePRs} stale PR${team.stalePRs !== 1 ? 's' : ''} ` +
        `and ${team.atRiskTasks} at-risk task${team.atRiskTasks !== 1 ? 's' : ''}.`
    }
  } else if (teams.length === 0) {
    const label = level === 'division' ? `${entityName} division` : entityName
    text = `${label} health is ${healthScore}/100.`
  } else {
    const worst = [...teams].sort((a, b) => a.healthScore - b.healthScore)[0]
    const label = level === 'division' ? `${entityName} division` : entityName
    text =
      `${label} health is ${healthScore}/100. ` +
      `The ${worst.name} team is the primary drag (score ${worst.healthScore}) ` +
      `with ${worst.stalePRs} stale PR${worst.stalePRs !== 1 ? 's' : ''} ` +
      `and ${worst.atRiskTasks} at-risk task${worst.atRiskTasks !== 1 ? 's' : ''}.`
  }

  if (criticalDevCount > 0) {
    if (criticalDevNames && criticalDevNames.length > 0) {
      const names = criticalDevNames.map(n => n.split(' ')[0]).slice(0, 2).join(' and ')
      const rest  = criticalDevCount - Math.min(criticalDevNames.length, 2)
      text +=
        ` ${names}${rest > 0 ? ` (+${rest} more)` : ''} ${criticalDevCount !== 1 ? 'are' : 'is'} ` +
        `at critical burnout risk — immediate check-in recommended.`
    } else {
      text +=
        ` ${criticalDevCount} developer${criticalDevCount !== 1 ? 's are' : ' is'} ` +
        `at critical burnout risk.`
    }
  }

  return text
}

export function computeBriefingInsight(
  developers: DevSummary[],
  teams: TeamRef[],
): string {
  const criticalDevs = developers.filter(d => d.riskLevel === 'critical')
  const atRiskDevs   = developers.filter(d => d.riskLevel === 'at-risk')
  const criticalCount = criticalDevs.length
  const atRiskCount   = atRiskDevs.length

  // Count blocked tasks per team
  const blockedByTeam: Record<string, number> = {}
  for (const dev of developers) {
    const blockedCount = dev.tasks.filter(t => t.status === 'blocked').length
    blockedByTeam[dev.teamId] = (blockedByTeam[dev.teamId] ?? 0) + blockedCount
  }

  const mostBlockedEntry = Object.entries(blockedByTeam).sort((a, b) => b[1] - a[1])[0]
  const mostBlockedTeam  = mostBlockedEntry ? teams.find(t => t.id === mostBlockedEntry[0]) : null

  if (criticalCount === 0 && atRiskCount === 0) {
    return `All ${developers.length} developer${developers.length !== 1 ? 's are' : ' is'} healthy this week.`
  }

  const parts: string[] = []

  if (criticalCount > 0) {
    // Name critical developers specifically
    const names = criticalDevs.map(d => (d.name ?? '').split(' ')[0]).filter(Boolean).slice(0, 2)
    const extra = criticalCount - names.length
    const label = names.length > 0
      ? `${names.join(' and ')}${extra > 0 ? ` (+${extra})` : ''} ${criticalCount !== 1 ? 'are' : 'is'} at critical risk`
      : `${criticalCount} developer${criticalCount !== 1 ? 's are' : ' is'} at critical risk`
    parts.push(label)
  }
  if (atRiskCount > 0) {
    parts.push(`${atRiskCount} ${atRiskCount !== 1 ? 'are' : 'is'} at-risk`)
  }

  let text = `${parts.join(' and ')} across your teams.`

  // Add most-blocked developer detail if we have a name
  const mostBlockedDev = [...developers]
    .map(d => ({ dev: d, blocked: d.tasks.filter(t => t.status === 'blocked').length }))
    .filter(x => x.blocked > 0)
    .sort((a, b) => b.blocked - a.blocked)[0]

  if (mostBlockedDev && mostBlockedDev.dev.name) {
    const firstName = mostBlockedDev.dev.name.split(' ')[0]
    const blockedTitle = mostBlockedDev.dev.tasks.find(t => t.status === 'blocked')?.title
    text += ` ${firstName} has the most blocked tasks${blockedTitle ? ` ("${blockedTitle.slice(0, 40)}")` : ''}.`
  } else if (mostBlockedTeam && mostBlockedEntry[1] > 0) {
    text += ` The ${mostBlockedTeam.name} team has the most blockers this week.`
  }

  return text
}

export function computeBurnoutInsight(
  developers: { riskLevel: string; teamId: string }[],
  teams: TeamRef[],
): string {
  const total    = developers.length
  const elevated = developers.filter(d => d.riskLevel !== 'healthy').length
  const critical = developers.filter(d => d.riskLevel === 'critical')

  if (elevated === 0) {
    return `All ${total} developer${total !== 1 ? 's are' : ' is'} healthy — no elevated burnout signals this week.`
  }

  let text = `${elevated} of ${total} developer${total !== 1 ? 's' : ''} show elevated burnout signals.`

  if (critical.length >= 2) {
    const critByTeam: Record<string, number> = {}
    for (const dev of critical) {
      critByTeam[dev.teamId] = (critByTeam[dev.teamId] ?? 0) + 1
    }
    const hotspotEntry  = Object.entries(critByTeam).sort((a, b) => b[1] - a[1])[0]
    const hotspotTeam   = teams.find(t => t.id === hotspotEntry[0])
    const hotspotCount  = hotspotEntry[1]

    if (hotspotCount >= 2 && hotspotTeam) {
      text +=
        ` ${hotspotCount} of ${critical.length} critical cases are in the ${hotspotTeam.name} team` +
        ` — this may indicate a team-level workload issue.`
    }
  }

  return text
}

export function computeDeveloperInsight(dev: {
  name: string
  riskLevel: string
  riskSignal: string
  commitPattern: string
  velocityTrend: string
  velocity: number
  tasks: { status: string }[]
  lastActive: string
}): string {
  const firstName = (dev.name ?? 'Developer').split(' ')[0]
  const blockedCount = dev.tasks.filter(t => t.status === 'blocked').length

  switch (dev.riskLevel) {
    case 'healthy': {
      const trendNote =
        dev.velocityTrend === 'up'   ? 'Velocity is trending up with no active blockers this week.' :
        dev.velocityTrend === 'down' ? 'Velocity has dipped slightly but no immediate concerns.'    :
                                       'Velocity is stable with no active blockers.'
      return `${firstName} is performing well. ${trendNote}`
    }
    case 'watch':
      return (
        `${firstName}'s activity has shifted — ${dev.riskSignal.toLowerCase()}. ` +
        `No immediate action needed, but worth monitoring.`
      )
    case 'at-risk': {
      const blockerNote = blockedCount > 0
        ? ` ${blockedCount} task${blockedCount !== 1 ? 's are' : ' is'} currently blocked.`
        : ''
      return (
        `${firstName} is showing early warning signs: ${dev.riskSignal.toLowerCase()}.` +
        `${blockerNote} A brief check-in could prevent further impact.`
      )
    }
    case 'critical': {
      const signals: string[] = [dev.riskSignal.toLowerCase()]
      if (blockedCount > 0) signals.push(`${blockedCount} task${blockedCount !== 1 ? 's' : ''} blocked`)
      if (dev.velocityTrend === 'down') signals.push('velocity declining')
      return (
        `${firstName} is at critical risk: ${signals.join(', ')}. ` +
        `Immediate 1:1 check-in recommended.`
      )
    }
    default:
      return `${firstName}: ${dev.riskSignal}`
  }
}

// ── AI Effort Insights ────────────────────────────────────────────────────────

export interface DevEffortSlim {
  userName: string
  totalTokens: number
  events: number
  tasks: string[]
}

export interface TaskEffortSlim {
  taskId: string
  totalTokens: number
  developers: string[]
}

export function computeAIEffortInsight(
  byDeveloper: DevEffortSlim[],
  byTask: TaskEffortSlim[],
): string {
  if (byDeveloper.length === 0) return 'No AI usage data for this period. Start the local agent or browser extension to capture Copilot token usage.'

  const total = byDeveloper.reduce((s, d) => s + d.totalTokens, 0)
  const avg   = Math.round(total / byDeveloper.length)
  const top   = byDeveloper[0]
  const firstName = (top.userName ?? '').split(' ')[0]
  const ratio = avg > 0 ? top.totalTokens / avg : 1

  // Attributed tasks (exclude "(unattributed)")
  const attributedTasks = byTask.filter(t => t.taskId !== '(unattributed)')

  if (ratio >= 1.8 && byDeveloper.length >= 2) {
    const taskMention = top.tasks.length > 0
      ? ` — primarily on ${top.tasks.slice(0, 2).join(' and ')}`
      : ''
    const topTask = attributedTasks[0]
    const taskNote = topTask
      ? ` Task ${topTask.taskId} has the highest AI investment` +
        (topTask.developers.length > 1 ? ` across ${topTask.developers.length} developers.` : '.')
      : ' Consider reviewing complexity distribution.'
    return (
      `${firstName} is consuming ${ratio.toFixed(1)}x the team average in AI tokens ` +
      `(${tokLabel(top.totalTokens)} total)${taskMention}.${taskNote}`
    )
  }

  if (attributedTasks.length === 0) {
    return (
      `${tokLabel(total)} tokens used this period across ${byDeveloper.length} developer${byDeveloper.length !== 1 ? 's' : ''}. ` +
      `No task attribution yet — name branches "PROJ-42-description" to enable per-task tracking.`
    )
  }

  const taskCount = attributedTasks.length
  return (
    `${tokLabel(total)} tokens across ${byDeveloper.length} developer${byDeveloper.length !== 1 ? 's' : ''} ` +
    `and ${taskCount} task${taskCount !== 1 ? 's' : ''} this period. ` +
    `${firstName} leads with ${tokLabel(top.totalTokens)} tokens` +
    (top.tasks.length > 0 ? ` on ${top.tasks[0]}.` : '.')
  )
}

// ── Sprint Insights ───────────────────────────────────────────────────────────

export function computeSprintInsight(
  completionPct: number,
  endDate: string,
  blockers: { description: string; tasksDelayed: number }[],
  criticalDevNames: string[],
): string {
  const confidence = completionPct >= 90 ? 92 : completionPct >= 70 ? 84 : 61
  let text = `At current velocity, the team will complete ${completionPct}% of Sprint commitments by ${endDate}. Confidence: ${confidence}%.`

  const topBlocker = blockers.find(b => b.tasksDelayed > 0)
  if (topBlocker) {
    text += ` Top risk: "${topBlocker.description}" is delaying ${topBlocker.tasksDelayed} task${topBlocker.tasksDelayed !== 1 ? 's' : ''}.`
  }

  if (criticalDevNames.length > 0) {
    const names = criticalDevNames.slice(0, 2).map(n => n.split(' ')[0]).join(' and ')
    text += ` ${names} ${criticalDevNames.length > 1 ? 'are' : 'is'} flagged for workload review.`
  }

  return text
}

// ── Roadmap Insights ──────────────────────────────────────────────────────────

export function computeRoadmapInsight(
  atRiskEpics: { title: string; status: string }[],
): string {
  if (atRiskEpics.length === 0) return 'All epics on track for 2026 — no cascading risks detected.'

  const names = atRiskEpics.slice(0, 2).map(e => e.title)
  const delayed = atRiskEpics.filter(e => e.status === 'delayed')

  let text = `${atRiskEpics.length} epic${atRiskEpics.length !== 1 ? 's are' : ' is'} at risk`
  if (names.length > 0) text += ` — ${names.join(' and ')}`
  if (delayed.length > 0) text += ` (${delayed.length} already delayed)`
  text += `. Delays here may cascade into downstream Q3/Q4 milestones.`

  return text
}

// ── AI Effort per Developer (BurnoutRisk page) ────────────────────────────────

export function computeAIBurnoutInsight(
  topDev: { name: string; aiEffortScore: number } | null,
  teamAvg: number,
): string {
  if (!topDev) return 'No AI effort data for this period.'

  const firstName = topDev.name.split(' ')[0]
  const ratio = teamAvg > 0 ? topDev.aiEffortScore / teamAvg : 1

  if (ratio >= 2) {
    return (
      `${firstName} is using ${ratio.toFixed(1)}x the team average in AI credits per story point (${topDev.aiEffortScore} credits/pt vs avg ${teamAvg}). ` +
      `Consider pairing with a senior engineer or breaking down complex tasks to reduce AI dependency.`
    )
  }
  if (ratio >= 1.4) {
    return (
      `${firstName} is moderately above the team average in AI credits per point (${topDev.aiEffortScore} vs avg ${teamAvg}). ` +
      `Worth monitoring — may indicate higher-complexity work or onboarding friction.`
    )
  }
  return `AI effort is well-distributed across the team. ${firstName} leads at ${topDev.aiEffortScore} credits/pt (team avg: ${teamAvg}).`
}
