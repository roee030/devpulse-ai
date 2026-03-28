# Drill-Aware Dashboard Insight + Per-Developer Burnout Insight Design

**Date:** 2026-03-28
**Status:** Approved

---

## Goal

Two improvements to the AI insight layer:
1. The Executive Dashboard insight updates dynamically as the user drills into a division or team — always reflecting the current view, not always the company level.
2. The Burnout Risk side panel shows a per-developer AI insight explaining *why* that developer is at their risk level.

## Approach

Both features use the same architecture as the existing AI insights: pure computed strings in `insights.ts`, no API calls, no new dependencies. `computeDashboardInsight` gains a `level` parameter. A new `computeDeveloperInsight` function is added.

---

## Feature 1: Drill-Aware Dashboard Insight

### Updated function signature

```ts
computeDashboardInsight(
  level: 'top' | 'division' | 'team',
  entityName: string,       // "Company" | division name | team name
  healthScore: number,      // score of the current entity
  teams: TeamSummary[],     // teams within the current scope
  criticalDevCount: number, // critical-risk devs within scope
): string
```

### Output by level

**Top (CTO):**
> "Company health is 72/100. The Frontend team is the primary drag (score 45) with 8 stale PRs and 4 at-risk tasks. 3 developers are at critical burnout risk."

**Division drill-in:**
> "Platform division health is 68/100. The Frontend team is the primary drag (score 45) with 8 stale PRs. 2 developers are at critical burnout risk."

**Team drill-in:**
> "Frontend team health is 45/100. The team has 8 stale PRs and 4 at-risk tasks. 2 developers are at critical burnout risk."

At team level there is only one team, so the "primary drag" sentence becomes a direct description of that team's metrics.

### Dashboard component changes

Pass drill-aware values to `computeDashboardInsight`:

| Drill level | `entityName` | `healthScore` | `teams` | `criticalDevCount` |
|---|---|---|---|---|
| `top` | `"Company"` | `companyHealthScore` | all `teams` | critical count from `visibleDevelopers` |
| `division` | `currentDivision.name` | `currentDivision.healthScore` | `teamsForDivision` | critical count from devs in that division |
| `team` | `currentTeam.name` | `currentTeam.healthScore` | `[currentTeam]` | critical count from `devsForTeam` |

The computation is wrapped in `useMemo` with `[drill, visibleDevelopers]` as dependencies so it recomputes on every drill navigation.

---

## Feature 2: Per-Developer Insight in Burnout Side Panel

### New function

```ts
computeDeveloperInsight(dev: {
  name: string
  riskLevel: string
  riskSignal: string
  commitPattern: string
  velocityTrend: string
  velocity: number
  tasks: { status: string }[]
  lastActive: string
}): string
```

### Output by risk level

**healthy:**
> "Alex is performing well. Velocity is trending up with no active blockers this week."

**watch:**
> "Jordan's commit frequency has dropped recently. No blockers yet, but worth monitoring over the next few days."

**at-risk:**
> "Sam has 2 blocked tasks and velocity is trending down. Their PR has been waiting — this is likely causing friction."

**critical:**
> "Morgan is showing multiple risk signals: commits are dropping, velocity is trending down, and 3 tasks are blocked. Immediate check-in recommended."

Logic uses: blocked task count, `velocityTrend`, `commitPattern`, `riskSignal`, `riskLevel`.

### Placement in side panel

`<AiInsightCard>` inserted immediately after the developer header (name / avatar / close button) and before the "Activity — Last 4 Weeks" heatmap section. First thing visible when panel opens.

---

## File Checklist

| File | Change |
|------|--------|
| `src/lib/insights.ts` | Update `computeDashboardInsight` signature; add `computeDeveloperInsight` |
| `src/test/insights.test.ts` | Update dashboard tests for new signature; add developer insight tests |
| `src/pages/ExecutiveDashboard.tsx` | Pass drill-aware args; wrap in useMemo |
| `src/pages/BurnoutRisk.tsx` | Add `<AiInsightCard>` in side panel using `computeDeveloperInsight` |

---

## Out of Scope

- No LLM API calls
- No changes to DeveloperCard (Burnout side panel is separate from DeveloperCard)
- No changes to other pages
