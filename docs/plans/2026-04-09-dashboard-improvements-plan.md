# Dashboard Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Three improvements: (1) reorderable metric cards with edit mode, (2) Bug & Blocker Radar section on dashboard, (3) Sprint Prediction Deep Dive moved above chart and open by default.

**Architecture:** All changes are UI-only. Edit mode uses framer-motion's built-in `Reorder` component (no new deps). Bug Radar derives data from existing `visibleDevelopers` and `sprint.topBlockers`. Sprint layout change is a move + state init change.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, framer-motion (Reorder), lucide-react

---

### Task 1: Sprint Prediction — Deep Dive above chart, open by default

Simplest task. Two changes in one file: move the Deep Dive section above the chart, and change its default state to open.

**Files:**
- Modify: `src/pages/SprintPrediction.tsx`

**Step 1: Read the file** to confirm current structure before editing.

**Step 2: Change default state from closed to open**

Find:
```tsx
const [deepDiveOpen, setDeepDiveOpen] = useState(false)
```

Replace with:
```tsx
const [deepDiveOpen, setDeepDiveOpen] = useState(true)
```

**Step 3: Reorder the JSX sections**

Current order in the `return`:
1. Page header div (mb-6)
2. Burndown chart motion.div (mb-6)
3. AiInsightCard
4. Deep Dive toggle button + AnimatePresence

New order:
1. Page header div (mb-6)
2. AiInsightCard
3. Deep Dive toggle button + AnimatePresence
4. Burndown chart motion.div — move the entire `<motion.div ... className="bg-card border border-border rounded-xl p-6 mb-6">` block to the END of the return, after the AnimatePresence closing tag. Change its `mb-6` to `mt-6` since it's now at the bottom.

The final JSX structure should be:
```tsx
return (
  <div>
    {/* Page header */}
    <div className="mb-6">...</div>

    {/* AI Insight */}
    <AiInsightCard text={...} />

    {/* Deep Dive toggle */}
    <motion.button ... >...</motion.button>

    {/* Deep Dive content */}
    <AnimatePresence>
      {deepDiveOpen && (
        <motion.div ...>
          ...
        </motion.div>
      )}
    </AnimatePresence>

    {/* Burndown chart — moved to bottom */}
    <motion.div ... className="bg-card border border-border rounded-xl p-6 mt-6">
      <h2>Burndown Chart</h2>
      ...
    </motion.div>
  </div>
)
```

**Step 4: Verify TypeScript compiles**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx tsc --noEmit
```

Expected: no errors.

**Step 5: Run tests**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx vitest run
```

Expected: all pass.

**Step 6: Commit**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && git add src/pages/SprintPrediction.tsx && git commit -m "feat: move deep dive above chart and open by default in Sprint Prediction"
```

---

### Task 2: Add `dragMode` prop to MetricCard

The edit mode will need to show a drag handle on each metric card. Add an optional `dragMode` prop to `MetricCard` that renders a `GripVertical` icon in the top-right corner when true.

**Files:**
- Modify: `src/components/ui/MetricCard.tsx`

**Step 1: Add `GripVertical` to the lucide-react import**

Current:
```tsx
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
```

New:
```tsx
import { TrendingUp, TrendingDown, Minus, GripVertical } from 'lucide-react'
```

**Step 2: Add `dragMode` to the Props interface**

Add `dragMode?: boolean` to the `interface Props` block.

**Step 3: Update the function signature**

Add `dragMode = false` to the destructured props.

**Step 4: Update the JSX — add drag handle overlay**

The card currently starts with:
```tsx
<motion.div
  ...
  className="bg-card border border-border rounded-xl p-5 cursor-default card-glow"
>
  <div className="flex items-start justify-between mb-3">
    <p className="text-text-secondary text-sm font-medium">{label}</p>
    {icon && <span className="text-text-secondary">{icon}</span>}
  </div>
```

Change `cursor-default` to `cursor-default ${dragMode ? 'cursor-grab active:cursor-grabbing border-accent/50' : ''}` and add the grip handle to the header row:

```tsx
<motion.div
  ...
  className={`bg-card border border-border rounded-xl p-5 card-glow ${dragMode ? 'cursor-grab active:cursor-grabbing border-accent/40' : 'cursor-default'}`}
>
  <div className="flex items-start justify-between mb-3">
    <p className="text-text-secondary text-sm font-medium">{label}</p>
    <div className="flex items-center gap-1.5">
      {dragMode && <GripVertical size={14} className="text-text-secondary/50" />}
      {icon && <span className="text-text-secondary">{icon}</span>}
    </div>
  </div>
```

**Step 5: Run tests**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx vitest run
```

Expected: all pass.

**Step 6: Commit**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && git add src/components/ui/MetricCard.tsx && git commit -m "feat: add dragMode prop to MetricCard"
```

---

### Task 3: Dashboard — editable metric card order

Add an Edit/Done button and reorderable metric cards using framer-motion's `Reorder` component.

**Files:**
- Modify: `src/pages/ExecutiveDashboard.tsx`

**Step 1: Read the file** to find the exact metric cards block and imports section.

**Step 2: Add imports**

Add to the existing react import:
```tsx
import { useState, useMemo, useEffect } from 'react'
```

Add `Reorder` to the framer-motion import:
```tsx
import { motion, AnimatePresence, Reorder } from 'framer-motion'
```

Add `Pencil`, `Check`, `GripVertical` to lucide-react imports:
```tsx
import { GitPullRequest, AlertTriangle, Target, Zap, ChevronRight, Pencil, Check } from 'lucide-react'
```

**Step 3: Define the card config type and default order above the component**

Add this right before `export function ExecutiveDashboard()`:

```tsx
const DEFAULT_CARD_ORDER = ['stale-prs', 'at-risk', 'sprint-pts', 'avg-velocity']

interface CardConfig {
  id: string
  label: string
  value: number
  unit?: string
  color: 'default' | 'danger' | 'warning' | 'success'
  icon: React.ReactNode
  trend: 'up' | 'down' | 'stable'
  trendLabel: string
}
```

**Step 4: Add state inside the component**

After the existing state declarations, add:

```tsx
const [isEditMode, setIsEditMode] = useState(false)
const [cardOrder, setCardOrder] = useState<string[]>(() => {
  try {
    const saved = localStorage.getItem('devpulse-dashboard-card-order')
    if (saved) {
      const parsed = JSON.parse(saved) as string[]
      // Validate: must contain all 4 expected IDs
      if (DEFAULT_CARD_ORDER.every(id => parsed.includes(id))) return parsed
    }
  } catch {}
  return DEFAULT_CARD_ORDER
})

useEffect(() => {
  localStorage.setItem('devpulse-dashboard-card-order', JSON.stringify(cardOrder))
}, [cardOrder])
```

**Step 5: Build the card configs array**

After the existing `insightText` useMemo, add:

```tsx
const cardConfigs = useMemo((): CardConfig[] => [
  { id: 'stale-prs',    label: 'Stale PRs',      value: displayStalePRs,          color: 'warning', icon: <GitPullRequest size={16} />, trend: 'up',     trendLabel: 'vs last sprint' },
  { id: 'at-risk',      label: 'At-Risk Tasks',   value: displayAtRisk,            color: 'danger',  icon: <AlertTriangle  size={16} />, trend: 'up',     trendLabel: `${Math.round((displayAtRisk / sprint.totalPoints) * 100)}% of sprint` },
  { id: 'sprint-pts',   label: 'Sprint Points',   value: sprint.completedPoints,   color: 'default', icon: <Target         size={16} />, trend: 'stable', trendLabel: 'points done', unit: `/${sprint.totalPoints}` },
  { id: 'avg-velocity', label: 'Avg Velocity',    value: avgVelocity,              color: 'success', icon: <Zap            size={16} />, trend: 'stable', trendLabel: 'across team',  unit: ' pts/day' },
], [displayStalePRs, displayAtRisk, avgVelocity])

const sortedCards = useMemo(
  () => cardOrder.map(id => cardConfigs.find(c => c.id === id)!).filter(Boolean),
  [cardOrder, cardConfigs],
)
```

**Step 6: Update the page header to include Edit/Done button**

Find the page header block:
```tsx
<div className="mb-5">
  <h1 className="text-xl md:text-2xl font-bold text-text-primary">Executive Dashboard</h1>
  <p className="text-text-secondary text-sm mt-1">{sprint.name} · {sprint.completedPoints}/{sprint.totalPoints} pts</p>
</div>
```

Replace with:
```tsx
<div className="mb-5 flex items-start justify-between gap-3">
  <div>
    <h1 className="text-xl md:text-2xl font-bold text-text-primary">Executive Dashboard</h1>
    <p className="text-text-secondary text-sm mt-1">{sprint.name} · {sprint.completedPoints}/{sprint.totalPoints} pts</p>
  </div>
  {activeUser.role !== 'developer' && (
    <button
      onClick={() => setIsEditMode(v => !v)}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${
        isEditMode
          ? 'bg-accent text-white border-accent'
          : 'bg-card border-border text-text-secondary hover:text-text-primary hover:border-accent/50'
      }`}
    >
      {isEditMode ? <Check size={13} /> : <Pencil size={13} />}
      {isEditMode ? 'Done' : 'Edit'}
    </button>
  )}
</div>
```

**Step 7: Replace the metric cards grid with reorderable version**

Find the current metric cards grid:
```tsx
{/* Metric tiles — 2×2 on mobile, 4-wide on xl */}
<div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
  <MetricCard label="Stale PRs"     ...  />
  <MetricCard label="At-Risk Tasks" ...  />
  <MetricCard label="Sprint Points" ...  />
  <MetricCard label="Avg Velocity"  ...  />
</div>
```

Replace with:
```tsx
{/* Metric tiles — reorderable in edit mode */}
{isEditMode ? (
  <Reorder.Group
    as="div"
    axis="x"
    values={sortedCards}
    onReorder={(newOrder) => setCardOrder(newOrder.map(c => c.id))}
    className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4"
  >
    {sortedCards.map((card) => (
      <Reorder.Item key={card.id} value={card} as="div">
        <MetricCard
          label={card.label}
          value={card.value}
          unit={card.unit}
          color={card.color}
          icon={card.icon}
          trend={card.trend}
          trendLabel={card.trendLabel}
          dragMode={true}
        />
      </Reorder.Item>
    ))}
  </Reorder.Group>
) : (
  <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
    {sortedCards.map((card, i) => (
      <MetricCard
        key={card.id}
        label={card.label}
        value={card.value}
        unit={card.unit}
        color={card.color}
        icon={card.icon}
        trend={card.trend}
        trendLabel={card.trendLabel}
        delay={i * 0.05}
      />
    ))}
  </div>
)}
```

**Step 8: Add edit mode hint text**

After the metrics row closing tag (the `</div>` that closes the `flex flex-col lg:flex-row` wrapper), add a subtle hint that appears only in edit mode:

```tsx
{isEditMode && (
  <p className="text-text-secondary text-xs text-center mb-4 -mt-2">
    Drag cards to reorder · click Done when finished
  </p>
)}
```

**Step 9: Verify TypeScript compiles**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx tsc --noEmit
```

Fix any type errors. Common issue: `React.ReactNode` in the `CardConfig` interface requires `import React from 'react'` or use `ReactNode` from react. If TypeScript complains about `React.ReactNode`, change `icon: React.ReactNode` to `icon: ReactNode` and add `import type { ReactNode } from 'react'` or just use `JSX.Element`.

**Step 10: Run tests**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx vitest run
```

**Step 11: Commit**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && git add src/pages/ExecutiveDashboard.tsx && git commit -m "feat: add editable metric card order to Executive Dashboard"
```

---

### Task 4: Bug & Blocker Radar section on dashboard

Add a new section below the metrics row showing blocked task counts from existing sprint and developer data.

**Files:**
- Modify: `src/pages/ExecutiveDashboard.tsx`

**Step 1: Add `sprint` import**

`sprint` is already imported from `'../data/mockData'` in the file. Verify it's there (it should be).

**Step 2: Add `Bug` icon to lucide-react imports**

Add `Bug` to the existing lucide import line:
```tsx
import { GitPullRequest, AlertTriangle, Target, Zap, ChevronRight, Pencil, Check, Bug } from 'lucide-react'
```

**Step 3: Add blocker data computation**

After the `sortedCards` useMemo, add:

```tsx
const blockedByTeam = useMemo(() => {
  const map: Record<string, { teamName: string; count: number }> = {}
  for (const dev of visibleDevelopers) {
    const blocked = dev.tasks.filter(t => t.status === 'blocked').length
    if (blocked === 0) continue
    const team = getTeamById(dev.teamId)
    if (!map[dev.teamId]) map[dev.teamId] = { teamName: team?.name ?? dev.teamId, count: 0 }
    map[dev.teamId].count += blocked
  }
  return Object.values(map).sort((a, b) => b.count - a.count)
}, [visibleDevelopers])

const totalBlocked = useMemo(
  () => visibleDevelopers.reduce((s, d) => s + d.tasks.filter(t => t.status === 'blocked').length, 0),
  [visibleDevelopers],
)
```

**Step 4: Add the Bug & Blocker Radar section to JSX**

Find the closing `</div>` of the `{/* Health score + Metrics */}` flex row (the one with `mb-6 md:mb-8`). After the edit mode hint text (from Task 3) and BEFORE the `{/* Developer solo view */}` block, insert:

```tsx
{/* Bug & Blocker Radar */}
{activeUser.role !== 'developer' && totalBlocked > 0 && (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay: 0.1 }}
    className="mb-6 md:mb-8"
  >
    <h2 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
      <Bug size={15} className="text-danger" />
      Bug &amp; Blocker Radar
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

      {/* Top Blockers */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-4">
          Top Blockers · <span className="text-danger">{totalBlocked} blocked task{totalBlocked !== 1 ? 's' : ''}</span>
        </p>
        <div className="space-y-3">
          {sprint.topBlockers.map((b, i) => (
            <div key={b.id} className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full bg-danger/15 text-danger text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="text-text-primary text-sm">{b.description}</p>
                <p className="text-danger text-xs mt-0.5">
                  {b.tasksDelayed} task{b.tasksDelayed !== 1 ? 's' : ''} delayed
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blocked by Team */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-text-secondary text-xs font-medium uppercase tracking-wider mb-4">
          Blocked by Team · <span className="text-danger">{blockedByTeam.length} team{blockedByTeam.length !== 1 ? 's' : ''} affected</span>
        </p>
        <div className="space-y-3">
          {blockedByTeam.map(({ teamName, count }) => {
            const maxCount = blockedByTeam[0]?.count ?? 1
            return (
              <div key={teamName} className="flex items-center gap-3">
                <span className="text-text-secondary text-xs w-28 truncate flex-shrink-0">{teamName}</span>
                <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-danger rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxCount) * 100}%` }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                  />
                </div>
                <span className="text-danger text-xs w-4 text-right flex-shrink-0 font-semibold">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  </motion.div>
)}
```

**Step 5: Verify TypeScript compiles**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx tsc --noEmit
```

**Step 6: Run tests**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx vitest run
```

Expected: all pass.

**Step 7: Commit**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && git add src/pages/ExecutiveDashboard.tsx && git commit -m "feat: add Bug and Blocker Radar section to Executive Dashboard"
```

---

### Task 5: Final build verification

**Step 1: Run all tests**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npx vitest run
```

Expected: all pass.

**Step 2: Build**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && npm run build
```

Expected: succeeds (the chunk size warning is pre-existing and not an error).

**Step 3: Push**

```bash
cd C:\Users\roeea\OneDrive\Documents\Github\ai-work-agent && git push
```
