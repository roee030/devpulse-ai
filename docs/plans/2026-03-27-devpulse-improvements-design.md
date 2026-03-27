# DevPulse Improvements — Design Doc
**Date:** 2026-03-27

## Summary

Three improvements to the DevPulse AI dashboard:
1. **Drill-down navigation** on the Executive Dashboard (Division → Team → Developer)
2. **Health Score breakdown panel** explaining each score's components
3. **Developer Briefing redesign** — grouped by team, with filter and sort

---

## 1. Drill-Down Navigation (Executive Dashboard)

### Navigation Model

The `ExecutiveDashboard` component gains local state:
```ts
type DrillLevel = 'top' | 'division' | 'team'
interface DrillState {
  level: DrillLevel
  divisionId: string | null
  teamId: string | null
}
```

Initial state depends on role:
- **CTO:** starts at `top` (divisions grid)
- **Division Head:** starts at `division` (teams grid for their division)
- **Team Lead:** starts at `team` (developers grid for their team)
- **Developer:** single card view (unchanged)

### Navigation Flow

```
CTO: [Divisions grid]
       → click Division card → [Teams grid for that division]
         → click Team card → [Developers grid for that team]
           → click Developer card → card expands in-place

Division Head: [Teams grid] → [Developers grid] → card expands
Team Lead: [Developers grid] → card expands
```

### Breadcrumb

Displayed above the grid at all drill levels below `top`:
```
NovaTech  /  Platform Division  /  Backend Team
```
Each segment is clickable to navigate back. Animated with Framer Motion fade.

### Grid Transition Animation

`AnimatePresence` wraps the grid. When drilling down/up:
- Exit: `opacity: 0, x: -20` (slide left out)
- Enter: `opacity: 0, x: 20` → `opacity: 1, x: 0` (slide in from right)
- Going back: reversed directions
- Duration: 0.25s

### Developer Card Expansion

Clicking a developer card toggles an expanded section below the card summary. Only one card can be expanded at a time (`expandedDevId` state).

Expanded section shows:
- **All tasks** (not just focus-3): status icon + title + story points + status badge
- **All open PRs**: PR number, title, waiting hours, reviewer, status badge
- **Risk signals**: risk level badge + signal text + velocity trend

Expansion animation: `height: 0 → auto` via Framer Motion layout animation.

---

## 2. Health Score Breakdown Panel

### Component: `HealthBreakdown`

Props:
```ts
interface HealthBreakdownProps {
  score: number
  jiraScore: number      // on-time % × 100
  githubScore: number    // (prMergeRate + velocityScore) / 2 × 100
  onTimePct: number      // completedPoints / totalPoints
  blockedTasks: number   // atRiskTasks
  prMergeRate: number    // (total - stale) / total PRs
  avgVelocity: number    // avg developer velocity
  stalePRs: number
}
```

### Computed Values in Mock Data

Since mock data has `completedPoints`, `totalPoints`, `stalePRs`, `atRiskTasks` on both teams and divisions, these can be derived:
- `jiraScore = Math.round((completedPoints / totalPoints) * 100)`
- `prMergeRate = Math.round(((totalPRs - stalePRs) / totalPRs) * 100)` — approximated
- `githubScore = Math.round((prMergeRate + Math.min(avgVelocity / 8, 1) * 100) / 2)`

### Placement

**Main dashboard HealthRing card:** "View breakdown" toggle link below the ring. Expands an inline panel.

**Division/Team cards (during drill-down):** Clicking the mini HealthRing on a card opens the breakdown. The same `HealthBreakdown` component is reused.

### Visual Design

```
─────────────────────────────────────
 Jira Performance          72 / 100
 ████████████░░░░  (60% of score)
   On-time completion  76%
   Blocked tasks       3
   Sprint completion   61%

 GitHub Activity           67 / 100
 ██████████░░░░░░  (40% of score)
   PR merge rate       80%
   Stale PRs           3
   Avg velocity        4.2 pt/day
─────────────────────────────────────
```

Mini progress bars use `motion.div` width animation. Color matches score: green ≥75, amber ≥50, red <50.

---

## 3. Developer Briefing Redesign

### Layout

Replace the flat grid with team-grouped sections. Each team section:
- **Header:** team name, lead name, health badge, developer count, collapse toggle
- **Content:** developer cards in responsive grid (same `DeveloperCard` component)
- Sections are collapsible (default expanded)

### Filter & Sort Bar

Sticky bar below the page header:

```
[ Filter by team: All ▼ ]  [ Risk: All | Critical | At-Risk | Watch | Healthy ]  [ Sort: Risk ↓ | Velocity ↑ ]
```

**State:**
```ts
interface BriefingFilters {
  teamIds: string[]          // empty = all
  riskLevels: RiskLevel[]    // empty = all
  sort: 'risk' | 'velocity' | 'none'
}
```

**Filtering logic:**
- If `teamIds` is non-empty, show only developers whose `teamId` is in the set
- If `riskLevels` is non-empty, show only developers whose `riskLevel` is in the set
- Both filters combined with AND

**Sorting logic (within each team group):**
- `risk`: critical → at-risk → watch → healthy
- `velocity`: ascending (slowest first)

**Team sections:** A team section is hidden if all its developers are filtered out (don't show empty sections).

### Role Visibility

- **CTO:** all teams grouped
- **Division Head:** only teams in their division
- **Team Lead:** only their own team (still shows team header + filter bar)
- **Developer:** solo card view unchanged

### Empty State

If filters result in no visible developers:
```
[ No developers match these filters ]
[ Clear filters ]
```

---

## Files to Change / Create

| File | Change |
|------|--------|
| `src/pages/ExecutiveDashboard.tsx` | Full rewrite with drill-down state + breadcrumb + expanded dev card |
| `src/pages/DeveloperBriefing.tsx` | Full rewrite with team grouping + filter/sort bar |
| `src/components/ui/HealthBreakdown.tsx` | New component |
| `src/components/ui/DeveloperCard.tsx` | Add `expanded` prop + expansion section |
| `src/data/mockData.ts` | Add health score breakdown fields to Team and Division types |

---

## Out of Scope

- URL-based filter state (no router param changes)
- Persisting filter state across page navigations
- Real API integration
- Mobile layout changes beyond what Tailwind responsive handles automatically
