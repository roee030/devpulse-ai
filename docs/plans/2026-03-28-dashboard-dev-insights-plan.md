# Drill-Aware Dashboard + Per-Developer Burnout Insights Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Executive Dashboard AI insight update as the user drills into divisions/teams, and add a per-developer AI insight explanation in the Burnout Risk side panel.

**Architecture:** Pure computed string functions in `insights.ts`. `computeDashboardInsight` gains a `level` + `entityName` parameter so it generates appropriate copy at company/division/team scope. New `computeDeveloperInsight` function generates a plain-English explanation of why a specific developer is at their risk level. No API calls, no new dependencies.

**Tech Stack:** React 18, TypeScript, Vitest + @testing-library/react, existing `AiInsightCard` component

---

### Task 1: Update `computeDashboardInsight` — add level + entityName params

The existing function signature changes. Existing tests will break immediately — they must be updated in the same task.

**Files:**
- Modify: `src/lib/insights.ts`
- Modify: `src/test/insights.test.ts`

**Step 1: Update the tests first (they will fail — that's expected)**

In `src/test/insights.test.ts`, find the `computeDashboardInsight` describe block and replace it entirely with:

```ts
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
```

**Step 2: Run tests to verify they fail**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx vitest run src/test/insights.test.ts
```

Expected: FAIL — wrong number of arguments to `computeDashboardInsight`

**Step 3: Update `computeDashboardInsight` in `src/lib/insights.ts`**

Replace the existing `computeDashboardInsight` function with:

```ts
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
```

**Step 4: Run tests to verify they pass**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx vitest run src/test/insights.test.ts
```

Expected: PASS (all `computeDashboardInsight` tests — the other tests for `computeBriefingInsight` and `computeBurnoutInsight` should still pass too)

**Step 5: Commit**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && git add src/lib/insights.ts src/test/insights.test.ts && git commit -m "feat: make computeDashboardInsight drill-level aware"
```

---

### Task 2: Add `computeDeveloperInsight` function with tests

**Files:**
- Modify: `src/lib/insights.ts`
- Modify: `src/test/insights.test.ts`

**Step 1: Write failing tests — append to `src/test/insights.test.ts`**

Add this new describe block at the end of the file:

```ts
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
```

Also add `computeDeveloperInsight` to the import at the top of the test file:

```ts
import {
  computeDashboardInsight,
  computeBriefingInsight,
  computeBurnoutInsight,
  computeDeveloperInsight,
} from '../lib/insights'
```

**Step 2: Run tests to verify they fail**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx vitest run src/test/insights.test.ts
```

Expected: FAIL — `computeDeveloperInsight` is not exported from `../lib/insights`

**Step 3: Add `computeDeveloperInsight` to `src/lib/insights.ts`**

Append this function at the end of the file:

```ts
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
  const firstName = dev.name.split(' ')[0]
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
```

**Step 4: Run tests to verify they pass**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx vitest run src/test/insights.test.ts
```

Expected: PASS (all tests including the 6 new `computeDeveloperInsight` tests)

**Step 5: Commit**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && git add src/lib/insights.ts src/test/insights.test.ts && git commit -m "feat: add computeDeveloperInsight function with tests"
```

---

### Task 3: Update `ExecutiveDashboard` to use drill-aware insight

**Files:**
- Modify: `src/pages/ExecutiveDashboard.tsx`

The dashboard already has `useMemo` imported. The goal is to replace the static `insightText` computation with one that adapts to the current `drill` state.

**Step 1: Read the current file** to find the exact lines of the existing computation (around line 209–214) and the existing imports.

**Step 2: Verify `useMemo` is already imported**

The file imports `useState` from react. Check whether `useMemo` is also imported. If not, add it to the import.

**Step 3: Replace the existing insight computation**

Find and replace this block (the existing two lines):

```tsx
const criticalDevCount = visibleDevelopers.filter(d => d.riskLevel === 'critical').length
const insightText = computeDashboardInsight(
  companyHealthScore,
  teams,
  criticalDevCount,
)
```

Replace with:

```tsx
const insightText = useMemo(() => {
  if (drill.level === 'team' && currentTeam) {
    const scopedCritical = devsForTeam.filter(d => d.riskLevel === 'critical').length
    return computeDashboardInsight('team', currentTeam.name, currentTeam.healthScore, [currentTeam], scopedCritical)
  }
  if (drill.level === 'division' && currentDivision) {
    const divDevs = visibleDevelopers.filter(d => d.divisionId === drill.divisionId)
    const scopedCritical = divDevs.filter(d => d.riskLevel === 'critical').length
    return computeDashboardInsight('division', currentDivision.name, currentDivision.healthScore, teamsForDivision, scopedCritical)
  }
  const scopedCritical = visibleDevelopers.filter(d => d.riskLevel === 'critical').length
  return computeDashboardInsight('top', 'Company', companyHealthScore, teams, scopedCritical)
}, [drill, visibleDevelopers, currentTeam, currentDivision, teamsForDivision, devsForTeam])
```

Note: `currentTeam`, `currentDivision`, `teamsForDivision`, `devsForTeam` are all already computed earlier in the component. `drill` is the existing state. `companyHealthScore` and `teams` are already imported from mockData.

**Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx tsc --noEmit
```

Fix any type errors (most likely: `useMemo` not imported — add it to the React import if needed).

**Step 5: Commit**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && git add src/pages/ExecutiveDashboard.tsx && git commit -m "feat: make dashboard insight drill-level aware"
```

---

### Task 4: Add per-developer insight to Burnout Risk side panel

**Files:**
- Modify: `src/pages/BurnoutRisk.tsx`

**Step 1: Read `src/pages/BurnoutRisk.tsx`** to understand the side panel structure before editing.

**Step 2: Add `computeDeveloperInsight` import**

In `src/pages/BurnoutRisk.tsx`, find the existing line:

```tsx
import { computeBurnoutInsight } from '../lib/insights'
```

Change it to:

```tsx
import { computeBurnoutInsight, computeDeveloperInsight } from '../lib/insights'
```

**Step 3: Insert `<AiInsightCard>` in the side panel**

In the side panel JSX, find the header div — it ends with the close button:

```tsx
                  <button onClick={() => setSelected(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-text-secondary text-xs font-medium mb-3 uppercase tracking-wider">Activity — Last 4 Weeks</p>
```

Insert `<AiInsightCard>` between the closing `</div>` of the header and the `<div className="mb-6">` activity section:

```tsx
                  <button onClick={() => setSelected(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                    <X size={18} />
                  </button>
                </div>

                {/* AI Insight */}
                <AiInsightCard text={computeDeveloperInsight(selected)} />

                <div className="mb-6">
                  <p className="text-text-secondary text-xs font-medium mb-3 uppercase tracking-wider">Activity — Last 4 Weeks</p>
```

Note: `selected` is a `Developer` object. The `Developer` interface has all the fields `computeDeveloperInsight` needs (`name`, `riskLevel`, `riskSignal`, `commitPattern`, `velocityTrend`, `velocity`, `tasks`, `lastActive`). No intermediate variable needed — pass it directly.

**Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx tsc --noEmit
```

**Step 5: Run full test suite**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx vitest run
```

Expected: all tests pass.

**Step 6: Commit**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && git add src/pages/BurnoutRisk.tsx && git commit -m "feat: add per-developer AI insight in Burnout Risk side panel"
```

---

### Task 5: Final build verification

**Step 1: Run all tests**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx vitest run
```

Expected: All tests PASS.

**Step 2: Build**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npm run build
```

Expected: Build succeeds with no TypeScript errors.

**Step 3: Commit any fixes if needed**

```bash
git add <files> && git commit -m "fix: resolve any issues from drill-aware insight integration"
```
