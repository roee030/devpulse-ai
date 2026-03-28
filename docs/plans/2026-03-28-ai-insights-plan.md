# AI Insights — Explain-the-Numbers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a plain-English AI insight card to the top of the Dashboard, Developer Briefing, and Burnout Risk pages that explains what the numbers mean to a manager.

**Architecture:** Pure computed strings — each page derives a one-paragraph summary from data already available at render time. A shared `AiInsightCard` component renders it. No API calls, no new dependencies.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vitest + @testing-library/react, lucide-react (Sparkles icon already used in SprintPrediction)

---

### Task 1: Create shared `AiInsightCard` component

**Files:**
- Create: `src/components/ui/AiInsightCard.tsx`
- Create: `src/test/AiInsightCard.test.tsx`

**Step 1: Write the failing test**

Create `src/test/AiInsightCard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { AiInsightCard } from '../components/ui/AiInsightCard'

describe('AiInsightCard', () => {
  it('renders the insight text', () => {
    render(<AiInsightCard text="Company health is 72/100." />)
    expect(screen.getByText('Company health is 72/100.')).toBeInTheDocument()
  })

  it('renders the AI Insight label', () => {
    render(<AiInsightCard text="Test" />)
    expect(screen.getByText('AI Insight')).toBeInTheDocument()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npx vitest run src/test/AiInsightCard.test.tsx
```

Expected: FAIL with "Cannot find module '../components/ui/AiInsightCard'"

**Step 3: Write the component**

Create `src/components/ui/AiInsightCard.tsx`:

```tsx
import { Sparkles } from 'lucide-react'

interface AiInsightCardProps {
  text: string
}

export function AiInsightCard({ text }: AiInsightCardProps) {
  return (
    <div className="bg-card border border-border border-l-4 border-l-accent rounded-xl p-4 mb-6 flex gap-3">
      <Sparkles size={16} className="text-accent flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-accent text-xs font-semibold mb-1 uppercase tracking-wide">AI Insight</p>
        <p className="text-text-secondary text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
```

**Step 4: Run test to verify it passes**

```bash
npx vitest run src/test/AiInsightCard.test.tsx
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add src/components/ui/AiInsightCard.tsx src/test/AiInsightCard.test.tsx
git commit -m "feat: add AiInsightCard shared component"
```

---

### Task 2: Create `insights.ts` — pure insight-computation functions

These are pure functions (no React, no hooks) that take data and return a string. They live separately so they are easy to unit-test.

**Files:**
- Create: `src/lib/insights.ts`
- Create: `src/test/insights.test.ts`

**Step 1: Write the failing tests**

Create `src/test/insights.test.ts`:

```ts
import {
  computeDashboardInsight,
  computeBriefingInsight,
  computeBurnoutInsight,
} from '../lib/insights'

// ── computeDashboardInsight ────────────────────────────────────────────────
describe('computeDashboardInsight', () => {
  const teams = [
    { name: 'Frontend',       healthScore: 45, stalePRs: 8, atRiskTasks: 4 },
    { name: 'Backend',        healthScore: 80, stalePRs: 1, atRiskTasks: 0 },
    { name: 'Infrastructure', healthScore: 60, stalePRs: 3, atRiskTasks: 2 },
  ]

  it('names the worst team and its stats', () => {
    const result = computeDashboardInsight(72, teams, 0)
    expect(result).toContain('72/100')
    expect(result).toContain('Frontend')
    expect(result).toContain('45')
    expect(result).toContain('8')
  })

  it('mentions critical dev count when > 0', () => {
    const result = computeDashboardInsight(72, teams, 3)
    expect(result).toContain('3 developers')
    expect(result).toContain('critical')
  })

  it('omits critical sentence when count is 0', () => {
    const result = computeDashboardInsight(72, teams, 0)
    expect(result).not.toContain('critical')
  })

  it('handles empty teams array gracefully', () => {
    const result = computeDashboardInsight(90, [], 0)
    expect(result).toContain('90/100')
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
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run src/test/insights.test.ts
```

Expected: FAIL with "Cannot find module '../lib/insights'"

**Step 3: Write the implementation**

Create `src/lib/insights.ts`:

```ts
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
  healthScore: number,
  teams: TeamSummary[],
  criticalDevCount: number,
): string {
  if (teams.length === 0) {
    return `Company health is ${healthScore}/100.`
  }

  const worst = [...teams].sort((a, b) => a.healthScore - b.healthScore)[0]

  let text =
    `Company health is ${healthScore}/100. ` +
    `The ${worst.name} team is the primary drag (score ${worst.healthScore}) ` +
    `with ${worst.stalePRs} stale PR${worst.stalePRs !== 1 ? 's' : ''} ` +
    `and ${worst.atRiskTasks} at-risk task${worst.atRiskTasks !== 1 ? 's' : ''}.`

  if (criticalDevCount > 0) {
    text +=
      ` ${criticalDevCount} developer${criticalDevCount !== 1 ? 's are' : ' is'} ` +
      `at critical burnout risk this sprint.`
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
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run src/test/insights.test.ts
```

Expected: PASS (all tests)

**Step 5: Commit**

```bash
git add src/lib/insights.ts src/test/insights.test.ts
git commit -m "feat: add insight computation functions with tests"
```

---

### Task 3: Add AI insight to Executive Dashboard

**Files:**
- Modify: `src/pages/ExecutiveDashboard.tsx`

The dashboard already imports from `mockData` and uses `visibleDevelopers` from `useUser()`. We need to:
1. Import `AiInsightCard` and `computeDashboardInsight`
2. Compute the insight string inside the component
3. Render `<AiInsightCard>` between the page header and the health/metrics row

**Step 1: Add imports**

In `src/pages/ExecutiveDashboard.tsx`, add these two imports alongside the existing ones:

```tsx
import { AiInsightCard } from '../components/ui/AiInsightCard'
import { computeDashboardInsight } from '../lib/insights'
```

**Step 2: Compute the insight string**

Inside `ExecutiveDashboard()`, after the existing derived values block (after `const gridKey = ...`), add:

```tsx
const criticalDevCount = visibleDevelopers.filter(d => d.riskLevel === 'critical').length
const insightText = computeDashboardInsight(
  displayHealthScore,
  visibleTeams,   // already available from useUser()
  criticalDevCount,
)
```

**Step 3: Render the card**

In the JSX, insert `<AiInsightCard text={insightText} />` between the page header `<div>` and the health/metrics flex row. The insertion point is after the closing `</div>` of the `mb-5` header block, before the `<div className="flex flex-col lg:flex-row gap-4 ...">` metrics row:

```tsx
{/* AI Insight */}
<AiInsightCard text={insightText} />

{/* Health score + Metrics */}
<div className="flex flex-col lg:flex-row gap-4 md:gap-6 mb-6 md:mb-8">
```

**Step 4: Manually verify in browser**

Run `npm run dev`, navigate to `/devpulse-ai/`, confirm an AI Insight card appears below the heading with accent left-border, Sparkles icon, and a sentence about the worst team.

**Step 5: Commit**

```bash
git add src/pages/ExecutiveDashboard.tsx
git commit -m "feat: add AI insight card to Executive Dashboard"
```

---

### Task 4: Add AI insight to Developer Briefing

**Files:**
- Modify: `src/pages/DeveloperBriefing.tsx`

**Step 1: Add imports**

```tsx
import { AiInsightCard } from '../components/ui/AiInsightCard'
import { computeBriefingInsight } from '../lib/insights'
```

**Step 2: Compute the insight string**

Inside `DeveloperBriefing()`, after the existing `useMemo` blocks, add:

```tsx
const briefingInsightText = useMemo(
  () => computeBriefingInsight(visibleDevelopers, visibleTeamsList),
  [visibleDevelopers, visibleTeamsList],
)
```

`visibleTeamsList` already has `{ id, name, ... }` — it satisfies `TeamRef[]`.

**Step 3: Render the card — manager view**

In the manager-view JSX (`// ── Manager view ────`), insert the card after the `<motion.div>` subtitle and before the sticky filter bar:

```tsx
{/* AI Insight */}
<AiInsightCard text={briefingInsightText} />

{/* Sticky filter bar */}
<div className="sticky top-14 z-10 ...">
```

**Step 4: Render the card — solo developer view**

In the solo-dev JSX (the `if (isSoloView && ...)` block), insert the card after the heading `<div className="mb-6">` block and before the developer profile card:

```tsx
{/* AI Insight */}
<AiInsightCard text={briefingInsightText} />

{/* Developer profile card */}
<motion.div ...>
```

**Step 5: Commit**

```bash
git add src/pages/DeveloperBriefing.tsx
git commit -m "feat: add AI insight card to Developer Briefing"
```

---

### Task 5: Add AI insight to Burnout Risk

**Files:**
- Modify: `src/pages/BurnoutRisk.tsx`

**Step 1: Read the top of the file to find the import block and component signature**

The file uses `useUser()` for `visibleDevelopers`. You will need to also pass `visibleTeams` (or derive team refs from the developers' teamIds using `getTeamById` from mockData).

**Step 2: Add imports**

```tsx
import { AiInsightCard } from '../components/ui/AiInsightCard'
import { computeBurnoutInsight } from '../lib/insights'
import { getTeamById } from '../data/mockData'
```

**Step 3: Compute the insight string**

Inside the `BurnoutRisk` component, after getting `visibleDevelopers` from `useUser()`, add:

```tsx
const teamRefs = useMemo(() => {
  const seen = new Set<string>()
  const result: { id: string; name: string }[] = []
  for (const dev of visibleDevelopers) {
    if (!seen.has(dev.teamId)) {
      seen.add(dev.teamId)
      const team = getTeamById(dev.teamId)
      if (team) result.push({ id: team.id, name: team.name })
    }
  }
  return result
}, [visibleDevelopers])

const burnoutInsightText = useMemo(
  () => computeBurnoutInsight(visibleDevelopers, teamRefs),
  [visibleDevelopers, teamRefs],
)
```

**Step 4: Render the card**

Insert `<AiInsightCard text={burnoutInsightText} />` after the page heading `<h1>` block and before the summary-badges row. Look for the heading element and place the card right after the closing tag of its container `<div>`.

**Step 5: Commit**

```bash
git add src/pages/BurnoutRisk.tsx
git commit -m "feat: add AI insight card to Burnout Risk"
```

---

### Task 6: Restyle Sprint Prediction insight to use `AiInsightCard`

SprintPrediction already has an AI banner. Replace its custom markup with `<AiInsightCard>` so all pages look consistent.

**Files:**
- Modify: `src/pages/SprintPrediction.tsx`

**Step 1: Read SprintPrediction.tsx**

Find the existing AI insight block. It likely looks like:

```tsx
<div className="... flex items-center gap-2 ...">
  <Sparkles ... />
  <span>Sprint is X% likely to complete ...</span>
</div>
```

**Step 2: Add import**

```tsx
import { AiInsightCard } from '../components/ui/AiInsightCard'
```

**Step 3: Replace the custom banner**

Remove the existing custom insight `<div>` and replace with:

```tsx
<AiInsightCard text={`Sprint is ${predictedCompletion}% likely to complete on time. ${confidenceText}`} />
```

Where `predictedCompletion` and the confidence value are whatever variables the existing code already uses.

**Step 4: Remove the now-unused `Sparkles` import if it's no longer used elsewhere in the file**

**Step 5: Commit**

```bash
git add src/pages/SprintPrediction.tsx
git commit -m "feat: restyle Sprint Prediction insight to use AiInsightCard"
```

---

### Task 7: Run full test suite and verify

**Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests PASS. If any fail, fix before proceeding.

**Step 2: Build to verify no TypeScript errors**

```bash
npm run build
```

Expected: Build completes with no errors or warnings.

**Step 3: Final commit (if any fixes were needed)**

```bash
git add -p
git commit -m "fix: resolve any type errors from AI insights integration"
```
