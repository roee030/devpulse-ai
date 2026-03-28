// src/lib/insights.ts
// Pure functions — no React, no hooks. Easy to unit-test.

interface TeamSummary {
  name: string
  healthScore: number
  stalePRs: number
  atRiskTasks: number
}

interface DevSummary {
  riskLevel: string
  teamId: string
  tasks: { status: string }[]
}

interface TeamRef {
  id: string
  name: string
}

export function computeDashboardInsight(
  level: 'top' | 'division' | 'team',
  entityName: string,
  healthScore: number,
  teams: TeamSummary[],
  criticalDevCount: number,
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
    text +=
      ` ${criticalDevCount} developer${criticalDevCount !== 1 ? 's are' : ' is'} ` +
      `at critical burnout risk.`
  }

  return text
}

export function computeBriefingInsight(
  developers: DevSummary[],
  teams: TeamRef[],
): string {
  const criticalCount = developers.filter(d => d.riskLevel === 'critical').length
  const atRiskCount   = developers.filter(d => d.riskLevel === 'at-risk').length

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
    parts.push(`${criticalCount} developer${criticalCount !== 1 ? 's are' : ' is'} at critical risk`)
  }
  if (atRiskCount > 0) {
    parts.push(`${atRiskCount} ${atRiskCount !== 1 ? 'are' : 'is'} at-risk`)
  }

  let text = `${parts.join(' and ')} across your teams.`

  if (mostBlockedTeam && mostBlockedEntry[1] > 0) {
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
