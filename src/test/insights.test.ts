import {
  computeDashboardInsight,
  computeBriefingInsight,
  computeBurnoutInsight,
  computeDeveloperInsight,
} from '../lib/insights'

// ── computeDashboardInsight ────────────────────────────────────────────────
describe('computeDashboardInsight — top level', () => {
  const teams = [
    { name: 'Frontend',       healthScore: 45, stalePRs: 8, atRiskTasks: 4 },
    { name: 'Backend',        healthScore: 80, stalePRs: 1, atRiskTasks: 0 },
    { name: 'Infrastructure', healthScore: 60, stalePRs: 3, atRiskTasks: 2 },
  ]

  it('names the worst team and its stats', () => {
    const result = computeDashboardInsight('top', 'Company', 72, teams, 0)
    expect(result).toContain('72/100')
    expect(result).toContain('Frontend')
    expect(result).toContain('45')
    expect(result).toContain('8')
  })

  it('mentions critical dev count when > 0', () => {
    const result = computeDashboardInsight('top', 'Company', 72, teams, 3)
    expect(result).toContain('3 developers')
    expect(result).toContain('critical')
  })

  it('omits critical sentence when count is 0', () => {
    const result = computeDashboardInsight('top', 'Company', 72, teams, 0)
    expect(result).not.toContain('critical')
  })

  it('handles empty teams array gracefully', () => {
    const result = computeDashboardInsight('top', 'Company', 90, [], 0)
    expect(result).toContain('90/100')
  })
})

describe('computeDashboardInsight — division level', () => {
  const divTeams = [
    { name: 'Frontend', healthScore: 45, stalePRs: 8, atRiskTasks: 4 },
    { name: 'Backend',  healthScore: 80, stalePRs: 1, atRiskTasks: 0 },
  ]

  it('uses division label and names worst team', () => {
    const result = computeDashboardInsight('division', 'Platform', 62, divTeams, 0)
    expect(result).toContain('Platform division health is 62/100')
    expect(result).toContain('Frontend')
  })

  it('mentions critical devs when present', () => {
    const result = computeDashboardInsight('division', 'Platform', 62, divTeams, 2)
    expect(result).toContain('2 developers')
    expect(result).toContain('critical')
  })
})

describe('computeDashboardInsight — team level', () => {
  const teamArr = [{ name: 'Frontend', healthScore: 45, stalePRs: 8, atRiskTasks: 4 }]

  it('uses team label and describes team metrics directly', () => {
    const result = computeDashboardInsight('team', 'Frontend', 45, teamArr, 0)
    expect(result).toContain('Frontend team health is 45/100')
    expect(result).toContain('8')
    expect(result).not.toContain('primary drag')
  })

  it('mentions critical devs when present', () => {
    const result = computeDashboardInsight('team', 'Frontend', 45, teamArr, 1)
    expect(result).toContain('1 developer')
    expect(result).toContain('critical')
  })
})

// ── computeBriefingInsight ─────────────────────────────────────────────────
describe('computeBriefingInsight', () => {
  const teams = [
    { id: 'team-1', name: 'Infrastructure' },
    { id: 'team-2', name: 'Frontend' },
  ]

  const developers = [
    { riskLevel: 'critical', teamId: 'team-1', tasks: [{ status: 'blocked' }, { status: 'blocked' }] },
    { riskLevel: 'critical', teamId: 'team-1', tasks: [{ status: 'blocked' }] },
    { riskLevel: 'at-risk',  teamId: 'team-2', tasks: [{ status: 'done' }] },
    { riskLevel: 'healthy',  teamId: 'team-2', tasks: [] },
  ]

  it('reports critical and at-risk counts', () => {
    const result = computeBriefingInsight(developers, teams)
    expect(result).toContain('2')
    expect(result).toContain('critical')
    expect(result).toContain('1')
    expect(result).toContain('at-risk')
  })

  it('names the team with the most blockers', () => {
    const result = computeBriefingInsight(developers, teams)
    expect(result).toContain('Infrastructure')
  })

  it('returns healthy message when everyone is healthy', () => {
    const healthyDevs = [
      { riskLevel: 'healthy', teamId: 'team-1', tasks: [] },
      { riskLevel: 'healthy', teamId: 'team-2', tasks: [] },
    ]
    const result = computeBriefingInsight(healthyDevs, teams)
    expect(result).toContain('healthy')
  })
})

// ── computeBurnoutInsight ──────────────────────────────────────────────────
describe('computeBurnoutInsight', () => {
  const teams = [
    { id: 'team-1', name: 'Infrastructure' },
    { id: 'team-2', name: 'Frontend' },
  ]

  it('reports elevated count vs total', () => {
    const devs = [
      { riskLevel: 'critical', teamId: 'team-1' },
      { riskLevel: 'critical', teamId: 'team-1' },
      { riskLevel: 'at-risk',  teamId: 'team-2' },
      { riskLevel: 'healthy',  teamId: 'team-2' },
    ]
    const result = computeBurnoutInsight(devs, teams)
    expect(result).toContain('3 of 4')
  })

  it('names the hotspot team when it has 2+ critical devs', () => {
    const devs = [
      { riskLevel: 'critical', teamId: 'team-1' },
      { riskLevel: 'critical', teamId: 'team-1' },
      { riskLevel: 'healthy',  teamId: 'team-2' },
    ]
    const result = computeBurnoutInsight(devs, teams)
    expect(result).toContain('Infrastructure')
    expect(result).toContain('team-level')
  })

  it('returns all-healthy message when no elevated signals', () => {
    const devs = [
      { riskLevel: 'healthy', teamId: 'team-1' },
      { riskLevel: 'healthy', teamId: 'team-2' },
    ]
    const result = computeBurnoutInsight(devs, teams)
    expect(result).toContain('healthy')
  })
})

// ── computeDeveloperInsight ────────────────────────────────────────────────
describe('computeDeveloperInsight', () => {
  const base = {
    name: 'Alex Chen',
    riskSignal: 'Commit frequency dropped 40%',
    commitPattern: 'Irregular',
    velocityTrend: 'stable' as const,
    velocity: 5,
    tasks: [] as { status: string }[],
    lastActive: '2 days ago',
  }

  it('returns positive message for healthy dev with stable trend', () => {
    const result = computeDeveloperInsight({ ...base, riskLevel: 'healthy' })
    expect(result).toContain('Alex')
    expect(result).toContain('performing well')
    expect(result).toContain('stable')
  })

  it('returns positive message for healthy dev with up trend', () => {
    const result = computeDeveloperInsight({ ...base, riskLevel: 'healthy', velocityTrend: 'up' })
    expect(result).toContain('trending up')
  })

  it('mentions monitoring for watch level', () => {
    const result = computeDeveloperInsight({ ...base, riskLevel: 'watch' })
    expect(result).toContain('Alex')
    expect(result).toContain('monitoring')
  })

  it('includes blocked task count for at-risk with blockers', () => {
    const devWithBlockers = {
      ...base,
      riskLevel: 'at-risk',
      tasks: [{ status: 'blocked' }, { status: 'blocked' }, { status: 'done' }],
    }
    const result = computeDeveloperInsight(devWithBlockers)
    expect(result).toContain('2 tasks are')
    expect(result).toContain('check-in')
  })

  it('returns critical message with immediate action', () => {
    const result = computeDeveloperInsight({ ...base, riskLevel: 'critical' })
    expect(result).toContain('critical risk')
    expect(result).toContain('Immediate')
  })

  it('includes blocked count in critical message', () => {
    const devWithBlocker = { ...base, riskLevel: 'critical', tasks: [{ status: 'blocked' }] }
    const result = computeDeveloperInsight(devWithBlocker)
    expect(result).toContain('1 task blocked')
  })
})
