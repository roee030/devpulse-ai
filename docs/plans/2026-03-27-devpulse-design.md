# DevPulse AI – Engineering Intelligence Platform
## Design Document
**Date:** 2026-03-27
**Stack:** Vite + React 18 + TypeScript + Tailwind CSS + Recharts + Framer Motion + React Router v6 + Lucide React
**Build approach:** Single-agent sequential

---

## 1. Architecture

```
src/
├── data/                  # All mock data (NovaTech company, users, sprint)
├── context/
│   └── UserContext.tsx    # Active user + role — wraps entire app
├── components/
│   ├── layout/            # AppShell, Sidebar, TopBar
│   └── ui/                # Shared: MetricCard, HealthRing, RoleBadge, etc.
├── pages/
│   ├── ExecutiveDashboard.tsx
│   ├── SprintPrediction.tsx
│   ├── DeveloperBriefing.tsx
│   ├── BurnoutRisk.tsx
│   └── ROICalculator.tsx
├── hooks/
│   └── useCountUp.ts      # Animated number counter
└── App.tsx                # Router + UserContext provider
```

`UserContext` holds the active user and exposes computed `visibleDivisions`, `visibleTeams`, `visibleDevelopers` filtered by the user's role. No prop-drilling.

---

## 2. Visual Design System

| Token | Value |
|---|---|
| Background | `#0a0a0f` |
| Card bg | `#111118` |
| Border | `#1e1e2e` |
| Primary accent | `#6366f1` (indigo) |
| Success | `#22c55e` |
| Warning | `#f59e0b` |
| Danger | `#ef4444` |
| Text primary | `#f1f5f9` |
| Text secondary | `#64748b` |
| Font | Inter |

---

## 3. Data Model

### Company: NovaTech Ltd.

**Divisions:**
- Platform (Head: Maya Cohen) → Backend Team (Avi Shapiro, 5 devs) + Infrastructure Team (Dana Mizrahi, 4 devs)
- Product (Head: Roi Friedman) → Frontend Team (Yael Katz, 5 devs) + Mobile Team (Tom Levi, 4 devs)
- Data (Head: Shira Goldberg) → Data Engineering (Nir Ben-Ami, 4 devs) + ML Team (Hila Peretz, 3 devs)

**Switchable users:** Lior Ben-David (CTO), 3 Division Heads, 6 Team Leads, ~25 developers

**Developer object:**
```ts
interface Developer {
  id: string
  name: string
  role: string
  teamId: string
  divisionId: string
  tasks: Task[]
  prStatus: PRStatus
  riskLevel: 'healthy' | 'watch' | 'at-risk' | 'critical'
  commitPattern: string        // e.g. "11pm–2am"
  activityHeatmap: number[][]  // 4 weeks × 7 days
  velocity: number             // points/day
}
```

**Sprint object:**
```ts
interface Sprint {
  name: string      // "Sprint 24 – Auth Refactor & Payment Module"
  startDate: string
  endDate: string
  totalPoints: 84
  completedPoints: 51
  projectedPoints: 58
  burndownData: BurndownDay[]  // 14 entries with ideal/actual/predicted
}
```

**UserContext computed values:**
- `visibleDivisions` — all 3 for CTO, own 1 for Division Head, empty for others
- `visibleTeams` — all for CTO, division's teams for Division Head, own team for Team Lead
- `visibleDevelopers` — filtered by hierarchy; for Developer: only themselves

---

## 4. Role-Based Perspective Matrix

| Page | CTO | Division Head | Team Lead | Developer |
|---|---|---|---|---|
| Executive Dashboard | All 3 division cards | Own division's team cards | Own team's developer cards | Own summary card |
| Sprint Prediction | Company-wide sprint | Division sprint | Team sprint | Personal tasks |
| Developer Briefing | All ~25 dev cards grid | Division devs | Team devs | Single large card (centered) |
| Burnout Risk | Full table | Division-filtered | Team-filtered | Own row highlighted |
| ROI Calculator | No role filter | No role filter | No role filter | No role filter |

---

## 5. Pages

### Page 1: Executive Dashboard
- Animated `HealthRing` (SVG, 0→score animation, color by threshold)
- 4 `MetricCard`s: Stale PRs, At-Risk Tasks, Sprint Completion, Team Velocity
- Role-filtered entity cards grid (division/team/developer depending on viewer)
- Each entity card: left border color-coded, hover glow, click to drill down

### Page 2: Sprint Prediction
- Sprint header: name, dates, committed points
- `BurndownChart`: 3 lines (ideal dashed gray, actual solid indigo, predicted dashed amber)
- AI Insight banner: indigo gradient, confidence score
- Collapsible Deep Dive panel: top 3 blockers, per-dev velocity bar chart, slip-risk task list

### Page 3: Developer Daily Briefing
- Tagline: "Your AI-powered focus for today"
- Role-filtered `DeveloperCard` grid (or single centered card for Developer role)
- Card contents: avatar, today's focus tasks, PR status with nudge copy, blocker status
- Warm, assistant-like copy (never surveillance-feeling)

### Page 4: Burnout Risk Alert
- Header: "Team Wellbeing Radar"
- Table: Developer | Team | Risk Level | Signal | Last Active | Trend
- `RiskBadge` with pulse animation on Critical
- Click row → `SidePanel` slides in from right: profile, `ActivityHeatmap`, signal details, suggested action

### Page 5: ROI Calculator
- 3 sliders: developers, meetings/week, hourly rate (₪)
- Real-time animated output cards: meeting cost, savings, payback period, annual ROI
- Formula: `meetingCost = devs × meetings × 1.5h × 4.3w × rate`, `savings = meetingCost × 0.6`, `devpulseCost = 150 × devs/month`
- CTA card at bottom

---

## 6. Animation Strategy

| Element | Animation |
|---|---|
| Page transition | fade + slide up 0.3s via `AnimatePresence` |
| Card entrance | stagger 0.05s delay per card |
| Numbers | `useCountUp` hook, animates on mount |
| HealthRing | stroke-dashoffset from 0 to final value |
| Charts | Recharts built-in animation from bottom |
| Role switch | `AnimatePresence` re-key on main content |
| Card hover | `scale(1.02)` + box-shadow glow |
| Risk badges | `pulse` CSS animation on Critical/red |
| SidePanel | slide in from right, backdrop blur |

---

## 7. Component Inventory

| Component | Used in |
|---|---|
| `HealthRing` | Dashboard |
| `MetricCard` | Dashboard |
| `DeveloperCard` | Dashboard, Briefing |
| `BurndownChart` | Sprint Prediction |
| `RiskBadge` | Burnout Risk, Developer cards |
| `ActivityHeatmap` | Burnout Risk side panel |
| `SidePanel` | Burnout Risk |
| `UserSwitcher` | TopBar (global) |
| `Sidebar` | Layout (global) |
| `TopBar` | Layout (global) |
| `useCountUp` | Dashboard, ROI Calculator |
