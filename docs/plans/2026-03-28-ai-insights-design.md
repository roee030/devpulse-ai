# AI Insights Design — Explain-the-Numbers

**Date:** 2026-03-28
**Status:** Approved

---

## Goal

Add a plain-English AI insight card to the top of each meaningful page so a manager can instantly understand what the numbers mean without having to interpret charts and metrics themselves.

## Approach

**Computed strings, no API calls.** Each page derives a one-paragraph summary from the data it already has at render time. A shared `<AiInsightCard>` component renders it with consistent styling. No external dependencies, no latency, no cost.

---

## Shared Component: `AiInsightCard`

**File:** `src/components/ui/AiInsightCard.tsx`

Props:
- `text: string` — the computed insight paragraph

Renders:
- Sparkles icon + "AI Insight" label in accent color (consistent with SprintPrediction)
- One paragraph of plain-English text
- `bg-card border border-border rounded-xl` card styling
- Accent-colored left border (`border-l-4 border-l-accent`) to visually distinguish it from data cards
- Placed below the page heading, above the main content

---

## Per-Page Insight Logic

### Executive Dashboard (`ExecutiveDashboard.tsx`)

**Placement:** Below the page heading, above the metric stat row.

**Computed from:** `companyHealthScore`, teams array, `companyAtRiskTasks`, `companyStalePRs`, developer risk levels.

**Example output:**
> "Company health is 72/100. The Frontend team is the primary drag (score 45) with 8 stale PRs and 4 at-risk tasks. Across all teams, 3 developers are at critical burnout risk this sprint."

**Logic:**
1. Find the team with the lowest `healthScore` → `worstTeam`
2. Count developers where `riskLevel === 'critical'` → `criticalCount`
3. Interpolate into a fixed sentence structure

---

### Developer Briefing (`DeveloperBriefing.tsx`)

**Placement:** Below the page heading, above the filter bar.

**Computed from:** `visibleDevelopers` risk levels, team grouping.

**Example output:**
> "2 developers are at critical risk and 4 are at-risk across your teams. The Infrastructure team has the most blockers this week."

**Logic:**
1. Count by `riskLevel` across `visibleDevelopers`
2. Find the team with the most blocked tasks → `mostBlockedTeam`
3. Interpolate into summary sentence

---

### Burnout Risk (`BurnoutRisk.tsx`)

**Placement:** Below the page heading, above the summary badges.

**Computed from:** `visibleDevelopers` risk levels, team grouping.

**Example output:**
> "6 of 25 developers show elevated burnout signals. Infrastructure accounts for 3 of 4 critical cases — this may indicate a team-level workload issue."

**Logic:**
1. Count developers with `riskLevel !== 'healthy'` → `elevatedCount`
2. Count total developers → `totalCount`
3. Group critical developers by team; find team with most → `hotspotTeam`
4. If hotspot team has ≥ 2 critical devs, append the team-level observation

---

### Sprint Prediction (`SprintPrediction.tsx`)

Already has an AI insight banner. Apply `<AiInsightCard>` styling to it for visual consistency with other pages. No logic changes needed.

---

### ROI Calculator (`ROICalculator.tsx`)

Skipped. The page is a user-driven calculator; computed insight text would only restate numbers already visible on screen.

---

## File Checklist

| File | Change |
|------|--------|
| `src/components/ui/AiInsightCard.tsx` | Create shared component |
| `src/pages/ExecutiveDashboard.tsx` | Add insight computation + `<AiInsightCard>` |
| `src/pages/DeveloperBriefing.tsx` | Add insight computation + `<AiInsightCard>` |
| `src/pages/BurnoutRisk.tsx` | Add insight computation + `<AiInsightCard>` |
| `src/pages/SprintPrediction.tsx` | Restyle existing banner to use `<AiInsightCard>` |

---

## Out of Scope

- No LLM API calls
- No streaming text
- No per-developer insight cards (page-level only)
- No ROI page insight
