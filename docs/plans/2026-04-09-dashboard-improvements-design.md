# Dashboard Improvements Design

**Date:** 2026-04-09
**Status:** Approved (async — user asleep, trusted implementation)

---

## Three improvements

### 1. Dashboard editable metric cards

An **Edit** button (pencil icon) in the dashboard page header activates edit mode. In edit mode:
- The 4 metric cards (Stale PRs, At-Risk Tasks, Sprint Points, Avg Velocity) become draggable
- Uses `framer-motion`'s built-in `Reorder.Group` + `Reorder.Item` — no new dependency
- Each card shows a drag handle icon (GripVertical from lucide-react)
- A **Done** button exits edit mode
- Card order is persisted to `localStorage` under key `devpulse-dashboard-card-order`
- Order is restored on mount; defaults to original order if no saved order exists

Only the metric cards are reorderable. The health ring, AI insight, and drill-down section are not part of the edit mode.

**Files:** `src/pages/ExecutiveDashboard.tsx`, `src/components/ui/MetricCard.tsx`

---

### 2. Bug & Blocker Radar section on dashboard

A new collapsible section below the metrics row, visible to all non-developer roles.

**Content:**
- Summary line: "X blocked tasks across Y teams this sprint"
- **Top Blockers** list — reuses `sprint.topBlockers` data (description + tasksDelayed count)
- **Team Blocker Breakdown** — per-team blocked task count derived from `visibleDevelopers`, rendered as small horizontal bars, sorted descending
- The section is open by default

**Data sources:** `sprint.topBlockers` (already in mockData), `visibleDevelopers.tasks.filter(blocked)` grouped by `teamId`, `getTeamById` for names.

**Files:** `src/pages/ExecutiveDashboard.tsx`

---

### 3. Sprint Prediction — Deep Dive above chart, open by default

Current order:
1. Header
2. Burndown Chart
3. AI Insight
4. Deep Dive (collapsed by default)

New order:
1. Header
2. AI Insight
3. Deep Dive (open by default — `useState(true)`)
4. Burndown Chart

The toggle button is kept so managers can collapse it. The chart moves to the bottom as secondary context.

**Files:** `src/pages/SprintPrediction.tsx`

---

## Out of scope

- No drag-and-drop for the health ring, AI insight, or drill-down section
- No server-side persistence (localStorage only)
- No new npm dependencies
- No editable content for the bug analysis section (read-only, derived from existing data)
