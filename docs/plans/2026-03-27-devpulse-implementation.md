# DevPulse AI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build DevPulse AI — a role-based engineering intelligence dashboard with 5 pages, animated UI, and mocked NovaTech company data.

**Architecture:** Vite + React 18 + TypeScript SPA. A `UserContext` holds the active user and exposes role-filtered data arrays used by every page. No real APIs — all data is static mock objects.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS v3, Framer Motion, Recharts, React Router v6, Lucide React

---

### Task 1: Scaffold project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`

**Step 1: Init Vite project**

```bash
cd C:/Users/roeea/OneDrive/Documents/Github/ai-work-agent/.claude/worktrees/strange-stonebraker
npm create vite@latest . -- --template react-ts --yes 2>/dev/null || true
```

**Step 2: Install dependencies**

```bash
npm install
npm install react-router-dom framer-motion recharts lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 3: Configure tailwind.config.js**

Replace the generated file with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0f',
        card: '#111118',
        border: '#1e1e2e',
        accent: '#6366f1',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        'text-primary': '#f1f5f9',
        'text-secondary': '#64748b',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

**Step 4: Replace src/index.css**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

* { box-sizing: border-box; }
body { background: #0a0a0f; color: #f1f5f9; font-family: 'Inter', sans-serif; margin: 0; }

@layer utilities {
  .card-glow:hover {
    box-shadow: 0 0 0 1px #6366f133, 0 4px 24px #6366f122;
  }
  .pulse-red {
    animation: pulse-red 2s infinite;
  }
  @keyframes pulse-red {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
}
```

**Step 5: Verify dev server starts**

```bash
npm run dev
```
Expected: "Local: http://localhost:5173"

**Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS + Tailwind project"
```

---

### Task 2: Mock data layer

**Files:**
- Create: `src/data/mockData.ts`

**Step 1: Write the full mock data file**

```ts
// src/data/mockData.ts

export type RiskLevel = 'healthy' | 'watch' | 'at-risk' | 'critical'
export type UserRole = 'cto' | 'divisionHead' | 'teamLead' | 'developer'

export interface Task {
  id: string
  title: string
  points: number
  status: 'todo' | 'in-progress' | 'done' | 'blocked'
}

export interface PRStatus {
  number: number
  title: string
  waitingHours: number
  reviewer: string
  status: 'open' | 'approved' | 'changes-requested'
}

export interface Developer {
  id: string
  name: string
  initials: string
  role: string
  teamId: string
  divisionId: string
  tasks: Task[]
  prStatus: PRStatus | null
  riskLevel: RiskLevel
  riskSignal: string
  commitPattern: string
  lastActive: string
  velocityTrend: 'up' | 'down' | 'stable'
  activityHeatmap: number[][]
  velocity: number
}

export interface Team {
  id: string
  name: string
  divisionId: string
  leadId: string
  healthScore: number
  stalePRs: number
  atRiskTasks: number
  completedPoints: number
  totalPoints: number
}

export interface Division {
  id: string
  name: string
  headId: string
  healthScore: number
  stalePRs: number
  atRiskTasks: number
  completedPoints: number
  totalPoints: number
}

export interface User {
  id: string
  name: string
  title: string
  role: UserRole
  divisionId?: string
  teamId?: string
  developerId?: string
}

export interface BurndownDay {
  day: number
  ideal: number
  actual: number | null
  predicted: number | null
}

// ─── Burndown data ────────────────────────────────────────────────────────────
export const sprintBurndown: BurndownDay[] = [
  { day: 1,  ideal: 84, actual: 84,   predicted: null },
  { day: 2,  ideal: 78, actual: 80,   predicted: null },
  { day: 3,  ideal: 72, actual: 75,   predicted: null },
  { day: 4,  ideal: 66, actual: 71,   predicted: null },
  { day: 5,  ideal: 60, actual: 67,   predicted: null },
  { day: 6,  ideal: 54, actual: 62,   predicted: null },
  { day: 7,  ideal: 48, actual: 58,   predicted: null },
  { day: 8,  ideal: 42, actual: 55,   predicted: null },
  { day: 9,  ideal: 36, actual: 51,   predicted: null },
  { day: 10, ideal: 30, actual: null,  predicted: 48 },
  { day: 11, ideal: 24, actual: null,  predicted: 44 },
  { day: 12, ideal: 18, actual: null,  predicted: 40 },
  { day: 13, ideal: 12, actual: null,  predicted: 35 },
  { day: 14, ideal: 0,  actual: null,  predicted: 26 },
]

export const sprint = {
  name: 'Sprint 24 – Auth Refactor & Payment Module',
  startDate: '2026-03-13',
  endDate: '2026-03-27',
  totalPoints: 84,
  completedPoints: 51,
  projectedPoints: 58,
  burndownData: sprintBurndown,
  topBlockers: [
    { id: '1', description: 'Unexpected bugs in Payment module', tasksDelayed: 3 },
    { id: '2', description: 'Auth token refresh edge case unresolved', tasksDelayed: 2 },
    { id: '3', description: 'Mobile CI pipeline flakiness', tasksDelayed: 1 },
  ],
}

// ─── Developers ───────────────────────────────────────────────────────────────
const makeHeatmap = (pattern: 'normal' | 'late' | 'sparse'): number[][] => {
  return Array.from({ length: 4 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      if (pattern === 'late') return d < 5 ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 8 + 2)
      if (pattern === 'sparse') return Math.random() > 0.6 ? 0 : Math.floor(Math.random() * 4)
      return Math.floor(Math.random() * 7 + 1)
    })
  )
}

export const developers: Developer[] = [
  // Backend Team
  {
    id: 'dev-1', name: 'Noa Levi', initials: 'NL', role: 'Senior Backend Engineer',
    teamId: 'team-backend', divisionId: 'div-platform',
    tasks: [
      { id: 't1', title: 'Implement JWT refresh token rotation', points: 5, status: 'in-progress' },
      { id: 't2', title: 'Write auth middleware unit tests', points: 3, status: 'todo' },
      { id: 't3', title: 'Fix rate limiter bug on /api/login', points: 2, status: 'blocked' },
    ],
    prStatus: { number: 234, title: 'feat: JWT refresh rotation', waitingHours: 18, reviewer: 'Avi Shapiro', status: 'open' },
    riskLevel: 'watch', riskSignal: 'PR open 18h, 2 blocked tasks',
    commitPattern: '9am–6pm', lastActive: '2 hours ago', velocityTrend: 'stable',
    activityHeatmap: makeHeatmap('normal'), velocity: 4.2,
  },
  {
    id: 'dev-2', name: 'Eran Katz', initials: 'EK', role: 'Backend Engineer',
    teamId: 'team-backend', divisionId: 'div-platform',
    tasks: [
      { id: 't4', title: 'Refactor user session store', points: 8, status: 'in-progress' },
      { id: 't5', title: 'Add Redis caching layer', points: 5, status: 'todo' },
    ],
    prStatus: { number: 231, title: 'refactor: session store', waitingHours: 4, reviewer: 'Noa Levi', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '8am–5pm', lastActive: '1 hour ago', velocityTrend: 'up',
    activityHeatmap: makeHeatmap('normal'), velocity: 5.1,
  },
  {
    id: 'dev-3', name: 'Michal Stern', initials: 'MS', role: 'Backend Engineer',
    teamId: 'team-backend', divisionId: 'div-platform',
    tasks: [
      { id: 't6', title: 'Payment gateway integration', points: 13, status: 'blocked' },
      { id: 't7', title: 'Webhook validation logic', points: 5, status: 'todo' },
    ],
    prStatus: null,
    riskLevel: 'at-risk', riskSignal: 'Large task blocked 3 days, no PR',
    commitPattern: '11pm–2am', lastActive: '14 hours ago', velocityTrend: 'down',
    activityHeatmap: makeHeatmap('late'), velocity: 2.1,
  },
  {
    id: 'dev-4', name: 'Yoni Dahan', initials: 'YD', role: 'Backend Engineer',
    teamId: 'team-backend', divisionId: 'div-platform',
    tasks: [
      { id: 't8', title: 'DB migration for auth tables', points: 3, status: 'done' },
      { id: 't9', title: 'Optimize slow query on /orders', points: 5, status: 'in-progress' },
    ],
    prStatus: { number: 229, title: 'fix: slow orders query', waitingHours: 2, reviewer: 'Eran Katz', status: 'approved' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '9am–7pm', lastActive: '30 min ago', velocityTrend: 'up',
    activityHeatmap: makeHeatmap('normal'), velocity: 6.0,
  },
  {
    id: 'dev-5', name: 'Lihi Ben-Moshe', initials: 'LB', role: 'Junior Backend Engineer',
    teamId: 'team-backend', divisionId: 'div-platform',
    tasks: [
      { id: 't10', title: 'Add input validation to /register', points: 3, status: 'in-progress' },
      { id: 't11', title: 'Write API integration tests', points: 5, status: 'todo' },
    ],
    prStatus: { number: 235, title: 'feat: /register validation', waitingHours: 26, reviewer: 'Noa Levi', status: 'changes-requested' },
    riskLevel: 'critical', riskSignal: 'Late night commits + PR awaiting changes 26h',
    commitPattern: '12am–3am', lastActive: '6 hours ago', velocityTrend: 'down',
    activityHeatmap: makeHeatmap('late'), velocity: 1.8,
  },
  // Infrastructure Team
  {
    id: 'dev-6', name: 'Gal Ofer', initials: 'GO', role: 'DevOps Engineer',
    teamId: 'team-infra', divisionId: 'div-platform',
    tasks: [
      { id: 't12', title: 'Set up Terraform for staging env', points: 8, status: 'in-progress' },
      { id: 't13', title: 'Update K8s resource limits', points: 3, status: 'done' },
    ],
    prStatus: { number: 220, title: 'infra: terraform staging', waitingHours: 6, reviewer: 'Dana Mizrahi', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '8am–5pm', lastActive: '1 hour ago', velocityTrend: 'stable',
    activityHeatmap: makeHeatmap('normal'), velocity: 4.5,
  },
  {
    id: 'dev-7', name: 'Tomer Avraham', initials: 'TA', role: 'DevOps Engineer',
    teamId: 'team-infra', divisionId: 'div-platform',
    tasks: [
      { id: 't14', title: 'CI pipeline optimization', points: 5, status: 'blocked' },
      { id: 't15', title: 'Monitor disk usage alerts', points: 2, status: 'done' },
    ],
    prStatus: null,
    riskLevel: 'watch', riskSignal: 'Blocked task, low commits this week',
    commitPattern: '10am–7pm', lastActive: '8 hours ago', velocityTrend: 'down',
    activityHeatmap: makeHeatmap('sparse'), velocity: 2.8,
  },
  {
    id: 'dev-8', name: 'Shaked Cohen', initials: 'SC', role: 'Site Reliability Engineer',
    teamId: 'team-infra', divisionId: 'div-platform',
    tasks: [
      { id: 't16', title: 'Incident runbook for DB failover', points: 3, status: 'done' },
      { id: 't17', title: 'Latency alert tuning', points: 2, status: 'in-progress' },
    ],
    prStatus: { number: 221, title: 'docs: DB failover runbook', waitingHours: 1, reviewer: 'Gal Ofer', status: 'approved' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '9am–6pm', lastActive: '20 min ago', velocityTrend: 'up',
    activityHeatmap: makeHeatmap('normal'), velocity: 5.5,
  },
  {
    id: 'dev-9', name: 'Rotem Hai', initials: 'RH', role: 'DevOps Engineer',
    teamId: 'team-infra', divisionId: 'div-platform',
    tasks: [
      { id: 't18', title: 'Helm chart for auth service', points: 5, status: 'in-progress' },
    ],
    prStatus: { number: 222, title: 'feat: auth service helm chart', waitingHours: 3, reviewer: 'Gal Ofer', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '9am–5pm', lastActive: '2 hours ago', velocityTrend: 'stable',
    activityHeatmap: makeHeatmap('normal'), velocity: 4.0,
  },
  // Frontend Team
  {
    id: 'dev-10', name: 'Alma Peretz', initials: 'AP', role: 'Senior Frontend Engineer',
    teamId: 'team-frontend', divisionId: 'div-product',
    tasks: [
      { id: 't19', title: 'Checkout flow redesign', points: 8, status: 'in-progress' },
      { id: 't20', title: 'Payment UI error states', points: 3, status: 'todo' },
    ],
    prStatus: { number: 245, title: 'feat: checkout redesign', waitingHours: 5, reviewer: 'Yael Katz', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '9am–6pm', lastActive: '1 hour ago', velocityTrend: 'up',
    activityHeatmap: makeHeatmap('normal'), velocity: 5.8,
  },
  {
    id: 'dev-11', name: 'Ben Shapira', initials: 'BS', role: 'Frontend Engineer',
    teamId: 'team-frontend', divisionId: 'div-product',
    tasks: [
      { id: 't21', title: 'Fix Safari auth redirect bug', points: 5, status: 'blocked' },
      { id: 't22', title: 'Add skeleton loaders to dashboard', points: 3, status: 'todo' },
    ],
    prStatus: null,
    riskLevel: 'at-risk', riskSignal: 'Late night commits + blocked task + no PR merged this sprint',
    commitPattern: '11pm–1am', lastActive: '16 hours ago', velocityTrend: 'down',
    activityHeatmap: makeHeatmap('late'), velocity: 1.5,
  },
  {
    id: 'dev-12', name: 'Shai Mizrahi', initials: 'SM', role: 'Frontend Engineer',
    teamId: 'team-frontend', divisionId: 'div-product',
    tasks: [
      { id: 't23', title: 'Implement dark mode toggle', points: 3, status: 'done' },
      { id: 't24', title: 'Mobile nav accessibility fixes', points: 2, status: 'in-progress' },
    ],
    prStatus: { number: 241, title: 'fix: mobile nav a11y', waitingHours: 2, reviewer: 'Alma Peretz', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '9am–5pm', lastActive: '30 min ago', velocityTrend: 'stable',
    activityHeatmap: makeHeatmap('normal'), velocity: 4.3,
  },
  {
    id: 'dev-13', name: 'Neta Cohen', initials: 'NC', role: 'Frontend Engineer',
    teamId: 'team-frontend', divisionId: 'div-product',
    tasks: [
      { id: 't25', title: 'Analytics event tracking', points: 5, status: 'in-progress' },
      { id: 't26', title: 'A/B test variant rendering', points: 3, status: 'todo' },
    ],
    prStatus: { number: 242, title: 'feat: analytics events', waitingHours: 9, reviewer: 'Shai Mizrahi', status: 'open' },
    riskLevel: 'watch', riskSignal: 'PR open 9h without review',
    commitPattern: '9am–6pm', lastActive: '3 hours ago', velocityTrend: 'stable',
    activityHeatmap: makeHeatmap('normal'), velocity: 3.9,
  },
  {
    id: 'dev-14', name: 'Ido Friedman', initials: 'IF', role: 'Junior Frontend Engineer',
    teamId: 'team-frontend', divisionId: 'div-product',
    tasks: [
      { id: 't27', title: 'Responsive table component', points: 5, status: 'in-progress' },
    ],
    prStatus: { number: 243, title: 'feat: responsive table', waitingHours: 12, reviewer: 'Ben Shapira', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '10am–7pm', lastActive: '4 hours ago', velocityTrend: 'up',
    activityHeatmap: makeHeatmap('normal'), velocity: 3.2,
  },
  // Mobile Team
  {
    id: 'dev-15', name: 'Carmel Azulay', initials: 'CA', role: 'iOS Engineer',
    teamId: 'team-mobile', divisionId: 'div-product',
    tasks: [
      { id: 't28', title: 'iOS payment sheet integration', points: 8, status: 'in-progress' },
      { id: 't29', title: 'Push notification deep linking', points: 5, status: 'todo' },
    ],
    prStatus: { number: 260, title: 'feat: iOS payment sheet', waitingHours: 7, reviewer: 'Tom Levi', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '9am–6pm', lastActive: '2 hours ago', velocityTrend: 'up',
    activityHeatmap: makeHeatmap('normal'), velocity: 5.2,
  },
  {
    id: 'dev-16', name: 'Ofer Ben-David', initials: 'OB', role: 'Android Engineer',
    teamId: 'team-mobile', divisionId: 'div-product',
    tasks: [
      { id: 't30', title: 'Android auth token refresh', points: 5, status: 'blocked' },
      { id: 't31', title: 'Biometric login implementation', points: 8, status: 'todo' },
    ],
    prStatus: null,
    riskLevel: 'at-risk', riskSignal: 'Blocked since day 6, no commits in 3 days',
    commitPattern: 'sporadic', lastActive: '3 days ago', velocityTrend: 'down',
    activityHeatmap: makeHeatmap('sparse'), velocity: 1.2,
  },
  {
    id: 'dev-17', name: 'Tamar Goldstein', initials: 'TG', role: 'Mobile Engineer',
    teamId: 'team-mobile', divisionId: 'div-product',
    tasks: [
      { id: 't32', title: 'CI pipeline for mobile builds', points: 5, status: 'in-progress' },
      { id: 't33', title: 'Fix flaky E2E tests', points: 3, status: 'in-progress' },
    ],
    prStatus: { number: 261, title: 'fix: flaky E2E tests', waitingHours: 3, reviewer: 'Carmel Azulay', status: 'open' },
    riskLevel: 'watch', riskSignal: 'CI flakiness causing delays',
    commitPattern: '9am–7pm', lastActive: '1 hour ago', velocityTrend: 'stable',
    activityHeatmap: makeHeatmap('normal'), velocity: 3.7,
  },
  {
    id: 'dev-18', name: 'Ariel Nissim', initials: 'AN', role: 'Junior Mobile Engineer',
    teamId: 'team-mobile', divisionId: 'div-product',
    tasks: [
      { id: 't34', title: 'Update onboarding screens copy', points: 2, status: 'done' },
      { id: 't35', title: 'Fix crash on low memory devices', points: 3, status: 'in-progress' },
    ],
    prStatus: { number: 262, title: 'fix: low memory crash', waitingHours: 1, reviewer: 'Tamar Goldstein', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '10am–6pm', lastActive: '1 hour ago', velocityTrend: 'up',
    activityHeatmap: makeHeatmap('normal'), velocity: 3.0,
  },
  // Data Engineering Team
  {
    id: 'dev-19', name: 'Doron Elazar', initials: 'DE', role: 'Data Engineer',
    teamId: 'team-data-eng', divisionId: 'div-data',
    tasks: [
      { id: 't36', title: 'ETL pipeline for auth events', points: 8, status: 'in-progress' },
      { id: 't37', title: 'Redshift schema migration', points: 5, status: 'todo' },
    ],
    prStatus: { number: 280, title: 'feat: auth events ETL', waitingHours: 4, reviewer: 'Nir Ben-Ami', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '9am–6pm', lastActive: '2 hours ago', velocityTrend: 'up',
    activityHeatmap: makeHeatmap('normal'), velocity: 4.8,
  },
  {
    id: 'dev-20', name: 'Linoy Biton', initials: 'LIB', role: 'Data Engineer',
    teamId: 'team-data-eng', divisionId: 'div-data',
    tasks: [
      { id: 't38', title: 'dbt model for user funnel', points: 5, status: 'in-progress' },
      { id: 't39', title: 'Data quality checks', points: 3, status: 'todo' },
    ],
    prStatus: { number: 281, title: 'feat: user funnel dbt model', waitingHours: 6, reviewer: 'Doron Elazar', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '9am–5pm', lastActive: '1 hour ago', velocityTrend: 'stable',
    activityHeatmap: makeHeatmap('normal'), velocity: 4.2,
  },
  {
    id: 'dev-21', name: 'Yahav Schwartz', initials: 'YS', role: 'Data Engineer',
    teamId: 'team-data-eng', divisionId: 'div-data',
    tasks: [
      { id: 't40', title: 'Kafka consumer for payment events', points: 8, status: 'blocked' },
    ],
    prStatus: null,
    riskLevel: 'watch', riskSignal: 'Blocked waiting on backend team',
    commitPattern: '10am–6pm', lastActive: '5 hours ago', velocityTrend: 'down',
    activityHeatmap: makeHeatmap('sparse'), velocity: 2.5,
  },
  {
    id: 'dev-22', name: 'Shir Oz', initials: 'SO', role: 'Junior Data Engineer',
    teamId: 'team-data-eng', divisionId: 'div-data',
    tasks: [
      { id: 't41', title: 'Write Airflow DAG docs', points: 2, status: 'done' },
      { id: 't42', title: 'Add unit tests to ETL helpers', points: 3, status: 'in-progress' },
    ],
    prStatus: { number: 282, title: 'docs: Airflow DAG docs', waitingHours: 1, reviewer: 'Linoy Biton', status: 'approved' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '9am–5pm', lastActive: '30 min ago', velocityTrend: 'up',
    activityHeatmap: makeHeatmap('normal'), velocity: 3.5,
  },
  // ML Team
  {
    id: 'dev-23', name: 'Paz Gonen', initials: 'PG', role: 'ML Engineer',
    teamId: 'team-ml', divisionId: 'div-data',
    tasks: [
      { id: 't43', title: 'Train churn prediction model v2', points: 13, status: 'in-progress' },
      { id: 't44', title: 'Model serving API endpoint', points: 5, status: 'todo' },
    ],
    prStatus: { number: 295, title: 'feat: churn model v2', waitingHours: 8, reviewer: 'Hila Peretz', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '9am–6pm', lastActive: '3 hours ago', velocityTrend: 'up',
    activityHeatmap: makeHeatmap('normal'), velocity: 5.0,
  },
  {
    id: 'dev-24', name: 'Matan Amar', initials: 'MA', role: 'ML Engineer',
    teamId: 'team-ml', divisionId: 'div-data',
    tasks: [
      { id: 't45', title: 'Feature store integration', points: 8, status: 'in-progress' },
      { id: 't46', title: 'A/B test evaluation framework', points: 5, status: 'todo' },
    ],
    prStatus: { number: 296, title: 'feat: feature store integration', waitingHours: 20, reviewer: 'Paz Gonen', status: 'changes-requested' },
    riskLevel: 'watch', riskSignal: 'PR awaiting changes 20h, low velocity this week',
    commitPattern: '10am–11pm', lastActive: '12 hours ago', velocityTrend: 'down',
    activityHeatmap: makeHeatmap('late'), velocity: 2.9,
  },
  {
    id: 'dev-25', name: 'Nufar Levy', initials: 'NuL', role: 'Junior ML Engineer',
    teamId: 'team-ml', divisionId: 'div-data',
    tasks: [
      { id: 't47', title: 'Data preprocessing pipeline', points: 5, status: 'in-progress' },
      { id: 't48', title: 'Write model evaluation metrics', points: 3, status: 'todo' },
    ],
    prStatus: { number: 297, title: 'feat: preprocessing pipeline', waitingHours: 2, reviewer: 'Matan Amar', status: 'open' },
    riskLevel: 'healthy', riskSignal: 'On track',
    commitPattern: '9am–5pm', lastActive: '1 hour ago', velocityTrend: 'stable',
    activityHeatmap: makeHeatmap('normal'), velocity: 3.8,
  },
]

// ─── Teams ────────────────────────────────────────────────────────────────────
export const teams: Team[] = [
  { id: 'team-backend',  name: 'Backend Team',          divisionId: 'div-platform', leadId: 'user-avi',   healthScore: 62, stalePRs: 2, atRiskTasks: 3, completedPoints: 18, totalPoints: 28 },
  { id: 'team-infra',    name: 'Infrastructure Team',   divisionId: 'div-platform', leadId: 'user-dana',  healthScore: 78, stalePRs: 1, atRiskTasks: 1, completedPoints: 11, totalPoints: 14 },
  { id: 'team-frontend', name: 'Frontend Team',         divisionId: 'div-product',  leadId: 'user-yael',  healthScore: 71, stalePRs: 2, atRiskTasks: 2, completedPoints: 12, totalPoints: 19 },
  { id: 'team-mobile',   name: 'Mobile Team',           divisionId: 'div-product',  leadId: 'user-tom',   healthScore: 55, stalePRs: 1, atRiskTasks: 3, completedPoints: 7,  totalPoints: 14 },
  { id: 'team-data-eng', name: 'Data Engineering Team', divisionId: 'div-data',     leadId: 'user-nir',   healthScore: 80, stalePRs: 1, atRiskTasks: 1, completedPoints: 9,  totalPoints: 12 },
  { id: 'team-ml',       name: 'ML Team',               divisionId: 'div-data',     leadId: 'user-hila',  healthScore: 68, stalePRs: 1, atRiskTasks: 1, completedPoints: 5,  totalPoints: 10 },
]

// ─── Divisions ────────────────────────────────────────────────────────────────
export const divisions: Division[] = [
  { id: 'div-platform', name: 'Platform Division', headId: 'user-maya',  healthScore: 70, stalePRs: 3, atRiskTasks: 4, completedPoints: 29, totalPoints: 42 },
  { id: 'div-product',  name: 'Product Division',  headId: 'user-roi',   healthScore: 63, stalePRs: 3, atRiskTasks: 5, completedPoints: 19, totalPoints: 33 },
  { id: 'div-data',     name: 'Data Division',     headId: 'user-shira', healthScore: 74, stalePRs: 2, atRiskTasks: 2, completedPoints: 14, totalPoints: 22 },
]

// ─── Users (switchable) ───────────────────────────────────────────────────────
export const users: User[] = [
  { id: 'user-lior',  name: 'Lior Ben-David', title: 'CTO',                          role: 'cto' },
  { id: 'user-maya',  name: 'Maya Cohen',     title: 'Head of Platform',             role: 'divisionHead', divisionId: 'div-platform' },
  { id: 'user-roi',   name: 'Roi Friedman',   title: 'Head of Product',              role: 'divisionHead', divisionId: 'div-product' },
  { id: 'user-shira', name: 'Shira Goldberg', title: 'Head of Data',                 role: 'divisionHead', divisionId: 'div-data' },
  { id: 'user-avi',   name: 'Avi Shapiro',    title: 'Team Lead – Backend',          role: 'teamLead', divisionId: 'div-platform', teamId: 'team-backend' },
  { id: 'user-dana',  name: 'Dana Mizrahi',   title: 'Team Lead – Infrastructure',   role: 'teamLead', divisionId: 'div-platform', teamId: 'team-infra' },
  { id: 'user-yael',  name: 'Yael Katz',      title: 'Team Lead – Frontend',         role: 'teamLead', divisionId: 'div-product',  teamId: 'team-frontend' },
  { id: 'user-tom',   name: 'Tom Levi',       title: 'Team Lead – Mobile',           role: 'teamLead', divisionId: 'div-product',  teamId: 'team-mobile' },
  { id: 'user-nir',   name: 'Nir Ben-Ami',    title: 'Team Lead – Data Engineering', role: 'teamLead', divisionId: 'div-data',     teamId: 'team-data-eng' },
  { id: 'user-hila',  name: 'Hila Peretz',    title: 'Team Lead – ML',               role: 'teamLead', divisionId: 'div-data',     teamId: 'team-ml' },
  { id: 'user-noa',   name: 'Noa Levi',       title: 'Senior Backend Engineer',      role: 'developer', divisionId: 'div-platform', teamId: 'team-backend',  developerId: 'dev-1' },
  { id: 'user-alma',  name: 'Alma Peretz',    title: 'Senior Frontend Engineer',     role: 'developer', divisionId: 'div-product',  teamId: 'team-frontend', developerId: 'dev-10' },
  { id: 'user-paz',   name: 'Paz Gonen',      title: 'ML Engineer',                  role: 'developer', divisionId: 'div-data',     teamId: 'team-ml',       developerId: 'dev-23' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const getDevelopersByTeam = (teamId: string) => developers.filter(d => d.teamId === teamId)
export const getDevelopersByDivision = (divisionId: string) => developers.filter(d => d.divisionId === divisionId)
export const getTeamsByDivision = (divisionId: string) => teams.filter(t => t.divisionId === divisionId)
export const getTeamById = (teamId: string) => teams.find(t => t.id === teamId)
export const getDivisionById = (divisionId: string) => divisions.find(d => d.id === divisionId)
export const getDeveloperById = (developerId: string) => developers.find(d => d.id === developerId)

export const companyHealthScore = Math.round(divisions.reduce((sum, d) => sum + d.healthScore, 0) / divisions.length)
export const companyStalePRs = divisions.reduce((sum, d) => sum + d.stalePRs, 0)
export const companyAtRiskTasks = divisions.reduce((sum, d) => sum + d.atRiskTasks, 0)
```

**Step 2: Commit**

```bash
git add src/data/mockData.ts
git commit -m "feat: add NovaTech mock data layer"
```

---

### Task 3: UserContext

**Files:**
- Create: `src/context/UserContext.tsx`

**Step 1: Write UserContext**

```tsx
// src/context/UserContext.tsx
import { createContext, useContext, useState, ReactNode, useMemo } from 'react'
import {
  users, developers, teams, divisions, User,
  getDevelopersByTeam, getDevelopersByDivision, getTeamsByDivision,
} from '../data/mockData'

interface UserContextValue {
  activeUser: User
  setActiveUser: (user: User) => void
  users: User[]
  visibleDivisions: typeof divisions
  visibleTeams: typeof teams
  visibleDevelopers: typeof developers
}

const UserContext = createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: ReactNode }) {
  const [activeUser, setActiveUser] = useState<User>(users[0]) // default: CTO

  const visibleDivisions = useMemo(() => {
    if (activeUser.role === 'cto') return divisions
    if (activeUser.role === 'divisionHead') return divisions.filter(d => d.id === activeUser.divisionId)
    return []
  }, [activeUser])

  const visibleTeams = useMemo(() => {
    if (activeUser.role === 'cto') return teams
    if (activeUser.role === 'divisionHead') return getTeamsByDivision(activeUser.divisionId!)
    if (activeUser.role === 'teamLead') return teams.filter(t => t.id === activeUser.teamId)
    return []
  }, [activeUser])

  const visibleDevelopers = useMemo(() => {
    if (activeUser.role === 'cto') return developers
    if (activeUser.role === 'divisionHead') return getDevelopersByDivision(activeUser.divisionId!)
    if (activeUser.role === 'teamLead') return getDevelopersByTeam(activeUser.teamId!)
    if (activeUser.role === 'developer') return developers.filter(d => d.id === activeUser.developerId)
    return []
  }, [activeUser])

  return (
    <UserContext.Provider value={{ activeUser, setActiveUser, users, visibleDivisions, visibleTeams, visibleDevelopers }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used within UserProvider')
  return ctx
}
```

**Step 2: Commit**

```bash
git add src/context/UserContext.tsx
git commit -m "feat: add role-based UserContext"
```

---

### Task 4: useCountUp hook

**Files:**
- Create: `src/hooks/useCountUp.ts`

**Step 1: Write hook**

```ts
// src/hooks/useCountUp.ts
import { useState, useEffect } from 'react'

export function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let startTime: number | null = null
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease out cubic
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])

  return value
}
```

**Step 2: Commit**

```bash
git add src/hooks/useCountUp.ts
git commit -m "feat: add useCountUp animation hook"
```

---

### Task 5: Layout — Sidebar, TopBar, AppShell

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/TopBar.tsx`
- Create: `src/components/layout/AppShell.tsx`

**Step 1: Write Sidebar.tsx**

```tsx
// src/components/layout/Sidebar.tsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, User, AlertTriangle, Calculator } from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { path: '/',           icon: LayoutDashboard, label: 'Executive Dashboard' },
  { path: '/sprint',     icon: TrendingUp,      label: 'Sprint Prediction' },
  { path: '/briefing',   icon: User,            label: 'Developer Briefing' },
  { path: '/burnout',    icon: AlertTriangle,   label: 'Burnout Risk' },
  { path: '/roi',        icon: Calculator,      label: 'ROI Calculator' },
]

export function Sidebar() {
  return (
    <aside className="w-60 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0 z-40">
      <div className="px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <span className="text-white text-xs font-bold">DP</span>
          </div>
          <div>
            <p className="text-text-primary font-semibold text-sm">DevPulse AI</p>
            <p className="text-text-secondary text-xs">NovaTech Ltd.</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-accent/15 text-accent'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-accent' : ''} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <p className="text-text-secondary text-xs">Sprint 24 · 2 days left</p>
        <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-warning rounded-full"
            initial={{ width: 0 }}
            animate={{ width: '86%' }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
          />
        </div>
      </div>
    </aside>
  )
}
```

**Step 2: Write TopBar.tsx**

```tsx
// src/components/layout/TopBar.tsx
import { useState } from 'react'
import { Bell, ChevronDown, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUser } from '../../context/UserContext'
import { User } from '../../data/mockData'

const roleLabel: Record<string, string> = {
  cto: 'C-Level',
  divisionHead: 'Division Head',
  teamLead: 'Team Lead',
  developer: 'Developer',
}

const roleGroups = [
  { label: 'C-Level', role: 'cto' },
  { label: 'Division Heads', role: 'divisionHead' },
  { label: 'Team Leads', role: 'teamLead' },
  { label: 'Developers', role: 'developer' },
]

export function TopBar() {
  const { activeUser, setActiveUser, users } = useUser()
  const [open, setOpen] = useState(false)

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-6 fixed top-0 left-60 right-0 z-30">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-text-secondary">NovaTech</span>
        <span className="text-border">/</span>
        <span className="text-text-primary font-medium">{activeUser.title}</span>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative text-text-secondary hover:text-text-primary transition-colors">
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-danger rounded-full pulse-red" />
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2.5 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm hover:border-accent/50 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center">
              <span className="text-accent text-xs font-semibold">
                {activeUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div className="text-left">
              <p className="text-text-primary font-medium text-xs leading-tight">{activeUser.name}</p>
              <p className="text-text-secondary text-xs leading-tight">{roleLabel[activeUser.role]}</p>
            </div>
            <ChevronDown size={14} className={`text-text-secondary transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
              >
                {roleGroups.map(group => {
                  const groupUsers = users.filter(u => u.role === group.role)
                  if (!groupUsers.length) return null
                  return (
                    <div key={group.role}>
                      <div className="px-3 pt-3 pb-1">
                        <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">{group.label}</p>
                      </div>
                      {groupUsers.map((user: User) => (
                        <button
                          key={user.id}
                          onClick={() => { setActiveUser(user); setOpen(false) }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                            <span className="text-accent text-xs font-semibold">
                              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-text-primary text-xs font-medium truncate">{user.name}</p>
                            <p className="text-text-secondary text-xs truncate">{user.title}</p>
                          </div>
                          {activeUser.id === user.id && <Check size={13} className="text-accent flex-shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
```

**Step 3: Write AppShell.tsx**

```tsx
// src/components/layout/AppShell.tsx
import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <TopBar />
      <main className="ml-60 pt-14 min-h-screen">
        <div className="p-6 max-w-[1400px]">
          {children}
        </div>
      </main>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add src/components/layout/
git commit -m "feat: add Sidebar, TopBar, AppShell layout components"
```

---

### Task 6: Router setup + App.tsx

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

**Step 1: Write App.tsx**

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { UserProvider } from './context/UserContext'
import { AppShell } from './components/layout/AppShell'
import { ExecutiveDashboard } from './pages/ExecutiveDashboard'
import { SprintPrediction } from './pages/SprintPrediction'
import { DeveloperBriefing } from './pages/DeveloperBriefing'
import { BurnoutRisk } from './pages/BurnoutRisk'
import { ROICalculator } from './pages/ROICalculator'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.25 }}
      >
        <Routes location={location}>
          <Route path="/"          element={<ExecutiveDashboard />} />
          <Route path="/sprint"    element={<SprintPrediction />} />
          <Route path="/briefing"  element={<DeveloperBriefing />} />
          <Route path="/burnout"   element={<BurnoutRisk />} />
          <Route path="/roi"       element={<ROICalculator />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UserProvider>
        <AppShell>
          <AnimatedRoutes />
        </AppShell>
      </UserProvider>
    </BrowserRouter>
  )
}
```

**Step 2: Write main.tsx**

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Step 3: Create stub pages so the app compiles**

Create these 5 files each with just a placeholder `<div>`:

```tsx
// src/pages/ExecutiveDashboard.tsx
export function ExecutiveDashboard() { return <div className="text-text-primary">Executive Dashboard</div> }
// src/pages/SprintPrediction.tsx
export function SprintPrediction() { return <div className="text-text-primary">Sprint Prediction</div> }
// src/pages/DeveloperBriefing.tsx
export function DeveloperBriefing() { return <div className="text-text-primary">Developer Briefing</div> }
// src/pages/BurnoutRisk.tsx
export function BurnoutRisk() { return <div className="text-text-primary">Burnout Risk</div> }
// src/pages/ROICalculator.tsx
export function ROICalculator() { return <div className="text-text-primary">ROI Calculator</div> }
```

**Step 4: Verify app compiles and layout renders**

```bash
npm run dev
```
Expected: app loads with dark sidebar, topbar, user switcher dropdown, nav links

**Step 5: Commit**

```bash
git add src/App.tsx src/main.tsx src/pages/
git commit -m "feat: add router, AnimatedRoutes, stub pages"
```

---

### Task 7: Shared UI components

**Files:**
- Create: `src/components/ui/HealthRing.tsx`
- Create: `src/components/ui/MetricCard.tsx`
- Create: `src/components/ui/RiskBadge.tsx`
- Create: `src/components/ui/DeveloperCard.tsx`
- Create: `src/components/ui/ActivityHeatmap.tsx`

**Step 1: HealthRing.tsx**

```tsx
// src/components/ui/HealthRing.tsx
import { motion } from 'framer-motion'

interface Props { score: number; size?: number }

function ringColor(score: number) {
  if (score >= 75) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

export function HealthRing({ score, size = 120 }: Props) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = ringColor(score)
  const cx = size / 2

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1e1e2e" strokeWidth={8} />
        <motion.circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-text-primary font-bold"
          style={{ fontSize: size * 0.22, color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-text-secondary" style={{ fontSize: size * 0.1 }}>/ 100</span>
      </div>
    </div>
  )
}
```

**Step 2: MetricCard.tsx**

```tsx
// src/components/ui/MetricCard.tsx
import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCountUp } from '../../hooks/useCountUp'

interface Props {
  label: string
  value: number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  trendLabel?: string
  icon?: ReactNode
  color?: 'default' | 'danger' | 'warning' | 'success'
  delay?: number
}

const colorMap = {
  default: 'text-accent',
  danger: 'text-danger',
  warning: 'text-warning',
  success: 'text-success',
}

export function MetricCard({ label, value, unit, trend, trendLabel, icon, color = 'default', delay = 0 }: Props) {
  const animated = useCountUp(value)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
      className="bg-card border border-border rounded-xl p-5 cursor-default card-glow"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-text-secondary text-sm font-medium">{label}</p>
        {icon && <span className="text-text-secondary">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold ${colorMap[color]}`}>
          {animated}{unit}
        </span>
      </div>
      {(trend || trendLabel) && (
        <div className="flex items-center gap-1 mt-2">
          {trend === 'up' && <TrendingUp size={13} className="text-success" />}
          {trend === 'down' && <TrendingDown size={13} className="text-danger" />}
          {trend === 'stable' && <Minus size={13} className="text-text-secondary" />}
          {trendLabel && <span className="text-text-secondary text-xs">{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  )
}
```

**Step 3: RiskBadge.tsx**

```tsx
// src/components/ui/RiskBadge.tsx
import { RiskLevel } from '../../data/mockData'

const config: Record<RiskLevel, { label: string; dot: string; text: string }> = {
  healthy:  { label: 'Healthy',  dot: 'bg-success',  text: 'text-success' },
  watch:    { label: 'Watch',    dot: 'bg-warning',  text: 'text-warning' },
  'at-risk':{ label: 'At Risk',  dot: 'bg-danger',   text: 'text-danger' },
  critical: { label: 'Critical', dot: 'bg-danger',   text: 'text-danger' },
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const c = config[level]
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${c.dot} ${level === 'critical' ? 'pulse-red' : ''}`} />
      <span className={`text-xs font-medium ${c.text}`}>{c.label}</span>
    </span>
  )
}
```

**Step 4: DeveloperCard.tsx**

```tsx
// src/components/ui/DeveloperCard.tsx
import { motion } from 'framer-motion'
import { GitPullRequest, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { Developer } from '../../data/mockData'
import { RiskBadge } from './RiskBadge'

const borderColor: Record<string, string> = {
  healthy: 'border-l-success',
  watch: 'border-l-warning',
  'at-risk': 'border-l-danger',
  critical: 'border-l-danger',
}

export function DeveloperCard({ dev, delay = 0 }: { dev: Developer; delay?: number }) {
  const focusTasks = dev.tasks.filter(t => t.status !== 'done').slice(0, 3)
  const hasBlocker = dev.tasks.some(t => t.status === 'blocked')

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.015, transition: { duration: 0.15 } }}
      className={`bg-card border border-border border-l-4 ${borderColor[dev.riskLevel]} rounded-xl p-5 card-glow`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <span className="text-accent text-sm font-bold">{dev.initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-text-primary font-semibold text-sm truncate">{dev.name}</p>
          <p className="text-text-secondary text-xs truncate">{dev.role}</p>
        </div>
        <RiskBadge level={dev.riskLevel} />
      </div>

      <div className="mb-4">
        <p className="text-text-secondary text-xs font-medium mb-2">Today's focus</p>
        <div className="space-y-1.5">
          {focusTasks.map(task => (
            <div key={task.id} className="flex items-start gap-2">
              {task.status === 'blocked'
                ? <AlertCircle size={13} className="text-danger mt-0.5 flex-shrink-0" />
                : task.status === 'in-progress'
                ? <Clock size={13} className="text-warning mt-0.5 flex-shrink-0" />
                : <CheckCircle size={13} className="text-text-secondary mt-0.5 flex-shrink-0" />
              }
              <span className="text-text-primary text-xs leading-relaxed">{task.title}</span>
              <span className="text-text-secondary text-xs ml-auto flex-shrink-0">{task.points}pt</span>
            </div>
          ))}
        </div>
      </div>

      {dev.prStatus && (
        <div className="border-t border-border pt-3 mb-3">
          <div className="flex items-center gap-2">
            <GitPullRequest size={13} className="text-accent flex-shrink-0" />
            <span className="text-text-secondary text-xs">
              {dev.prStatus.waitingHours >= 12
                ? `PR #${dev.prStatus.number} waiting ${dev.prStatus.waitingHours}h — nudged ${dev.prStatus.reviewer}`
                : `PR #${dev.prStatus.number} · ${dev.prStatus.status}`}
            </span>
          </div>
        </div>
      )}

      <div className={`flex items-center gap-2 text-xs ${hasBlocker ? 'text-danger' : 'text-success'}`}>
        {hasBlocker
          ? <><AlertCircle size={12} /> <span>Blocked task needs attention</span></>
          : <><CheckCircle size={12} /> <span>You're on track — keep it up</span></>
        }
      </div>
    </motion.div>
  )
}
```

**Step 5: ActivityHeatmap.tsx**

```tsx
// src/components/ui/ActivityHeatmap.tsx
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function cellColor(value: number) {
  if (value === 0) return 'bg-border'
  if (value <= 2) return 'bg-accent/20'
  if (value <= 4) return 'bg-accent/40'
  if (value <= 6) return 'bg-accent/70'
  return 'bg-accent'
}

export function ActivityHeatmap({ data }: { data: number[][] }) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map(d => <span key={d} className="text-text-secondary text-xs text-center">{d}</span>)}
      </div>
      <div className="space-y-1">
        {data.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((val, di) => (
              <div
                key={di}
                title={`${val} commits`}
                className={`h-4 rounded-sm ${cellColor(val)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 6: Commit**

```bash
git add src/components/ui/ src/hooks/useCountUp.ts
git commit -m "feat: add shared UI components (HealthRing, MetricCard, RiskBadge, DeveloperCard, ActivityHeatmap)"
```

---

### Task 8: Page 1 — Executive Dashboard

**Files:**
- Modify: `src/pages/ExecutiveDashboard.tsx`

**Step 1: Write the full page**

```tsx
// src/pages/ExecutiveDashboard.tsx
import { motion } from 'framer-motion'
import { GitPullRequest, AlertTriangle, Target, Zap } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { HealthRing } from '../components/ui/HealthRing'
import { MetricCard } from '../components/ui/MetricCard'
import { DeveloperCard } from '../components/ui/DeveloperCard'
import {
  divisions, teams, companyHealthScore, companyStalePRs, companyAtRiskTasks,
  sprint, getDevelopersByTeam, getTeamsByDivision
} from '../data/mockData'

function healthColor(score: number) {
  if (score >= 75) return 'border-l-success'
  if (score >= 50) return 'border-l-warning'
  return 'border-l-danger'
}

function DivisionCard({ div, delay }: { div: typeof divisions[0]; delay: number }) {
  const divTeams = getTeamsByDivision(div.id)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.015 }}
      className={`bg-card border border-border border-l-4 ${healthColor(div.healthScore)} rounded-xl p-5 cursor-pointer card-glow`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-text-primary font-semibold">{div.name}</p>
          <p className="text-text-secondary text-xs mt-0.5">{divTeams.length} teams</p>
        </div>
        <HealthRing score={div.healthScore} size={64} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-text-secondary text-xs">Stale PRs</p>
          <p className="text-warning font-semibold">{div.stalePRs}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">At Risk</p>
          <p className="text-danger font-semibold">{div.atRiskTasks}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">Points</p>
          <p className="text-text-primary font-semibold">{div.completedPoints}/{div.totalPoints}</p>
        </div>
      </div>
    </motion.div>
  )
}

function TeamCard({ team, delay }: { team: typeof teams[0]; delay: number }) {
  const devs = getDevelopersByTeam(team.id)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.015 }}
      className={`bg-card border border-border border-l-4 ${healthColor(team.healthScore)} rounded-xl p-5 cursor-pointer card-glow`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-text-primary font-semibold">{team.name}</p>
          <p className="text-text-secondary text-xs mt-0.5">{devs.length} developers</p>
        </div>
        <HealthRing score={team.healthScore} size={56} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-text-secondary text-xs">Stale PRs</p>
          <p className="text-warning font-semibold">{team.stalePRs}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">At Risk</p>
          <p className="text-danger font-semibold">{team.atRiskTasks}</p>
        </div>
        <div>
          <p className="text-text-secondary text-xs">Points</p>
          <p className="text-text-primary font-semibold">{team.completedPoints}/{team.totalPoints}</p>
        </div>
      </div>
    </motion.div>
  )
}

export function ExecutiveDashboard() {
  const { activeUser, visibleDivisions, visibleTeams, visibleDevelopers } = useUser()

  const displayHealthScore =
    activeUser.role === 'cto' ? companyHealthScore
    : activeUser.role === 'divisionHead' ? (visibleDivisions[0]?.healthScore ?? 0)
    : activeUser.role === 'teamLead' ? (visibleTeams[0]?.healthScore ?? 0)
    : 0

  const displayStalePRs =
    activeUser.role === 'cto' ? companyStalePRs
    : visibleTeams.reduce((s, t) => s + t.stalePRs, 0) || visibleDivisions.reduce((s, d) => s + d.stalePRs, 0)

  const displayAtRisk =
    activeUser.role === 'cto' ? companyAtRiskTasks
    : visibleTeams.reduce((s, t) => s + t.atRiskTasks, 0) || visibleDivisions.reduce((s, d) => s + d.atRiskTasks, 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Executive Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">{sprint.name} · {sprint.completedPoints}/{sprint.totalPoints} points completed</p>
      </div>

      {/* Health + Metrics */}
      <div className="flex flex-col lg:flex-row gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center min-w-[200px]"
        >
          <HealthRing score={displayHealthScore} size={140} />
          <p className="text-text-secondary text-sm mt-3 text-center">Team Health Score</p>
        </motion.div>

        <div className="flex-1 grid grid-cols-2 xl:grid-cols-4 gap-4">
          <MetricCard label="Stale PRs" value={displayStalePRs} color="warning" icon={<GitPullRequest size={16} />} trend="up" trendLabel="vs last sprint" delay={0.1} />
          <MetricCard label="At-Risk Tasks" value={displayAtRisk} color="danger" icon={<AlertTriangle size={16} />} trend="up" trendLabel={`${Math.round((displayAtRisk / sprint.totalPoints) * 100)}% of sprint`} delay={0.15} />
          <MetricCard label="Sprint Completion" value={sprint.completedPoints} unit={`/${sprint.totalPoints}`} color="default" icon={<Target size={16} />} trend="stable" trendLabel="points done" delay={0.2} />
          <MetricCard label="Team Velocity" value={Math.round(visibleDevelopers.reduce((s, d) => s + d.velocity, 0) * 10) / 10} unit=" pts/day" color="success" icon={<Zap size={16} />} trend="stable" trendLabel="avg across team" delay={0.25} />
        </div>
      </div>

      {/* Role-filtered entity grid */}
      {activeUser.role === 'cto' && (
        <div>
          <h2 className="text-text-primary font-semibold mb-4">Divisions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleDivisions.map((div, i) => <DivisionCard key={div.id} div={div} delay={i * 0.05} />)}
          </div>
        </div>
      )}
      {activeUser.role === 'divisionHead' && (
        <div>
          <h2 className="text-text-primary font-semibold mb-4">Teams in {visibleDivisions[0]?.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleTeams.map((t, i) => <TeamCard key={t.id} team={t} delay={i * 0.05} />)}
          </div>
        </div>
      )}
      {activeUser.role === 'teamLead' && (
        <div>
          <h2 className="text-text-primary font-semibold mb-4">Developers in {visibleTeams[0]?.name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleDevelopers.map((dev, i) => <DeveloperCard key={dev.id} dev={dev} delay={i * 0.05} />)}
          </div>
        </div>
      )}
      {activeUser.role === 'developer' && visibleDevelopers[0] && (
        <div className="max-w-md">
          <h2 className="text-text-primary font-semibold mb-4">Your Summary</h2>
          <DeveloperCard dev={visibleDevelopers[0]} />
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/pages/ExecutiveDashboard.tsx
git commit -m "feat: Executive Dashboard page with HealthRing, MetricCards, role-filtered grid"
```

---

### Task 9: Page 2 — Sprint Prediction

**Files:**
- Modify: `src/pages/SprintPrediction.tsx`

**Step 1: Write the full page**

```tsx
// src/pages/SprintPrediction.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Sparkles, ChevronDown, AlertTriangle } from 'lucide-react'
import { sprint } from '../data/mockData'
import { useUser } from '../context/UserContext'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs">
      <p className="text-text-secondary mb-1">Day {label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value} pts</p>
      ))}
    </div>
  )
}

export function SprintPrediction() {
  const { activeUser, visibleDevelopers } = useUser()
  const [deepDiveOpen, setDeepDiveOpen] = useState(false)

  const completionPct = Math.round((sprint.projectedPoints / sprint.totalPoints) * 100)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Sprint Prediction</h1>
        <p className="text-text-secondary text-sm mt-1">
          {sprint.name} · {sprint.startDate} → {sprint.endDate} · {sprint.totalPoints} committed points
        </p>
      </div>

      {/* Burndown chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card border border-border rounded-xl p-6 mb-6"
      >
        <h2 className="text-text-primary font-semibold mb-4">Burndown Chart</h2>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={sprint.burndownData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 12 }} label={{ value: 'Sprint Day', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} label={{ value: 'Points Remaining', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
            <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#64748b" strokeDasharray="6 3" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} connectNulls={false} />
            <Line type="monotone" dataKey="predicted" name="AI Predicted" stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={2} dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* AI Insight banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-gradient-to-r from-accent/20 to-accent/5 border border-accent/30 rounded-xl p-5 mb-6"
      >
        <div className="flex items-start gap-3">
          <Sparkles size={18} className="text-accent mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-text-primary text-sm font-medium mb-1">
              At current velocity, the team will complete {completionPct}% of Sprint commitments by end of day {sprint.endDate}.
            </p>
            <p className="text-text-secondary text-xs">Confidence: <span className="text-accent font-medium">84%</span></p>
          </div>
        </div>
      </motion.div>

      {/* Deep Dive toggle */}
      <motion.button
        onClick={() => setDeepDiveOpen(v => !v)}
        className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 font-medium mb-4 transition-colors"
        whileHover={{ x: 2 }}
      >
        <ChevronDown size={16} className={`transition-transform ${deepDiveOpen ? 'rotate-180' : ''}`} />
        {deepDiveOpen ? 'Hide' : 'Show'} Deep Dive Analysis
      </motion.button>

      <AnimatePresence>
        {deepDiveOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top blockers */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-warning" /> Top Blockers
                </h3>
                <div className="space-y-3">
                  {sprint.topBlockers.map((b, i) => (
                    <div key={b.id} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-warning/15 text-warning text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <div>
                        <p className="text-text-primary text-sm">{b.description}</p>
                        <p className="text-danger text-xs mt-0.5">{b.tasksDelayed} {b.tasksDelayed === 1 ? 'task' : 'tasks'} delayed</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-dev velocity */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-4">Developer Velocity</h3>
                <div className="space-y-2.5">
                  {visibleDevelopers.slice(0, 8).map(dev => (
                    <div key={dev.id} className="flex items-center gap-3">
                      <span className="text-text-secondary text-xs w-20 truncate flex-shrink-0">{dev.name.split(' ')[0]}</span>
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-accent rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((dev.velocity / 8) * 100, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                        />
                      </div>
                      <span className="text-text-secondary text-xs w-12 text-right flex-shrink-0">{dev.velocity} pt/d</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Slip-risk tasks */}
            <div className="bg-card border border-border rounded-xl p-5 mt-4">
              <h3 className="text-text-primary font-semibold mb-4">Tasks Most Likely to Slip</h3>
              <div className="space-y-2">
                {visibleDevelopers
                  .flatMap(d => d.tasks.filter(t => t.status === 'blocked' || (t.status === 'in-progress' && t.points >= 8)))
                  .slice(0, 5)
                  .map(task => (
                    <div key={task.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${task.status === 'blocked' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'}`}>
                        {task.status === 'blocked' ? 'Blocked' : 'High Risk'}
                      </span>
                      <span className="text-text-primary text-sm flex-1">{task.title}</span>
                      <span className="text-text-secondary text-xs">{task.points}pt</span>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/pages/SprintPrediction.tsx
git commit -m "feat: Sprint Prediction page with burndown chart, AI insight, deep dive panel"
```

---

### Task 10: Page 3 — Developer Daily Briefing

**Files:**
- Modify: `src/pages/DeveloperBriefing.tsx`

**Step 1: Write the full page**

```tsx
// src/pages/DeveloperBriefing.tsx
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { DeveloperCard } from '../components/ui/DeveloperCard'

export function DeveloperBriefing() {
  const { activeUser, visibleDevelopers } = useUser()
  const isSoloView = activeUser.role === 'developer'

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-text-primary">Developer Daily Briefing</h1>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 text-text-secondary text-sm mb-8"
      >
        <Sparkles size={14} className="text-accent" />
        <span>Your AI-powered focus for today</span>
      </motion.div>

      {isSoloView && visibleDevelopers[0] ? (
        <div className="max-w-lg mx-auto">
          <DeveloperCard dev={visibleDevelopers[0]} />
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-4 bg-accent/10 border border-accent/20 rounded-xl p-4"
          >
            <p className="text-accent text-sm font-medium mb-1">Here's what will help you finish today smoothly</p>
            <p className="text-text-secondary text-xs leading-relaxed">
              Focus on your top in-progress task first. You have {visibleDevelopers[0].tasks.filter(t => t.status === 'blocked').length} blocked task(s) that may need a sync with your team lead.
            </p>
          </motion.div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleDevelopers.map((dev, i) => (
            <DeveloperCard key={dev.id} dev={dev} delay={i * 0.05} />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/pages/DeveloperBriefing.tsx
git commit -m "feat: Developer Briefing page with role-filtered cards"
```

---

### Task 11: Page 4 — Burnout Risk Alert

**Files:**
- Modify: `src/pages/BurnoutRisk.tsx`

**Step 1: Write the full page**

```tsx
// src/pages/BurnoutRisk.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, X, MessageSquare } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { Developer } from '../data/mockData'
import { RiskBadge } from '../components/ui/RiskBadge'
import { ActivityHeatmap } from '../components/ui/ActivityHeatmap'

function TrendIcon({ trend }: { trend: Developer['velocityTrend'] }) {
  if (trend === 'up') return <TrendingUp size={14} className="text-success" />
  if (trend === 'down') return <TrendingDown size={14} className="text-danger" />
  return <Minus size={14} className="text-text-secondary" />
}

export function BurnoutRisk() {
  const { visibleDevelopers, activeUser } = useUser()
  const [selected, setSelected] = useState<Developer | null>(null)

  return (
    <div className="relative">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Team Wellbeing Radar</h1>
        <p className="text-text-secondary text-sm mt-1">Early signals, before they become problems</p>
      </div>

      {/* Summary badges */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {(['healthy','watch','at-risk','critical'] as const).map(level => {
          const count = visibleDevelopers.filter(d => d.riskLevel === level).length
          return (
            <div key={level} className="bg-card border border-border rounded-lg px-4 py-2 flex items-center gap-2">
              <RiskBadge level={level} />
              <span className="text-text-primary font-semibold">{count}</span>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="grid grid-cols-[1fr_1fr_120px_2fr_100px_80px] gap-4 px-5 py-3 border-b border-border text-text-secondary text-xs font-medium uppercase tracking-wider">
          <span>Developer</span>
          <span>Team</span>
          <span>Risk Level</span>
          <span>Signal</span>
          <span>Last Active</span>
          <span>Trend</span>
        </div>
        <div>
          {visibleDevelopers.map((dev, i) => (
            <motion.div
              key={dev.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelected(dev)}
              className={`grid grid-cols-[1fr_1fr_120px_2fr_100px_80px] gap-4 px-5 py-3.5 border-b border-border last:border-0 cursor-pointer hover:bg-white/3 transition-colors ${
                activeUser.role === 'developer' && dev.id === visibleDevelopers[0]?.id ? 'bg-accent/5' : ''
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent text-xs font-semibold">{dev.initials}</span>
                </div>
                <span className="text-text-primary text-sm font-medium truncate">{dev.name}</span>
              </div>
              <span className="text-text-secondary text-sm self-center truncate">{dev.teamId.replace('team-', '').replace('-', ' ')}</span>
              <span className="self-center"><RiskBadge level={dev.riskLevel} /></span>
              <span className="text-text-secondary text-xs self-center leading-relaxed">{dev.riskSignal}</span>
              <span className="text-text-secondary text-xs self-center">{dev.lastActive}</span>
              <span className="self-center"><TrendIcon trend={dev.velocityTrend} /></span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Side panel */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 h-full w-[420px] bg-card border-l border-border z-50 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <span className="text-accent font-bold">{selected.initials}</span>
                    </div>
                    <div>
                      <p className="text-text-primary font-semibold">{selected.name}</p>
                      <p className="text-text-secondary text-xs">{selected.role}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                    <X size={18} />
                  </button>
                </div>

                <div className="mb-6">
                  <p className="text-text-secondary text-xs font-medium mb-3 uppercase tracking-wider">Activity — Last 4 Weeks</p>
                  <ActivityHeatmap data={selected.activityHeatmap} />
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-text-secondary text-xs font-medium uppercase tracking-wider">Risk Signals</p>
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-text-secondary text-xs mb-0.5">Commit pattern</p>
                    <p className="text-text-primary text-sm font-medium">{selected.commitPattern}</p>
                  </div>
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-text-secondary text-xs mb-0.5">Velocity trend</p>
                    <div className="flex items-center gap-1.5">
                      <TrendIcon trend={selected.velocityTrend} />
                      <p className="text-text-primary text-sm font-medium capitalize">{selected.velocityTrend}</p>
                    </div>
                  </div>
                  <div className="bg-bg rounded-lg p-3">
                    <p className="text-text-secondary text-xs mb-0.5">Signal detail</p>
                    <p className="text-text-primary text-sm">{selected.riskSignal}</p>
                  </div>
                </div>

                {selected.riskLevel !== 'healthy' && (
                  <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <MessageSquare size={15} className="text-accent mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-accent text-xs font-semibold mb-1">Suggested Action</p>
                        <p className="text-text-secondary text-xs leading-relaxed">
                          {selected.riskLevel === 'critical'
                            ? 'Schedule a 1:1 this week to check in. Consider redistributing their blocked tasks to unblock progress.'
                            : 'Consider a brief check-in to understand any blockers or concerns. A 15-minute async message may be all that\'s needed.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/pages/BurnoutRisk.tsx
git commit -m "feat: Burnout Risk page with table, risk badges, side panel with heatmap"
```

---

### Task 12: Page 5 — ROI Calculator

**Files:**
- Modify: `src/pages/ROICalculator.tsx`

**Step 1: Write the full page**

```tsx
// src/pages/ROICalculator.tsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Calendar, TrendingUp, Zap, ArrowRight } from 'lucide-react'
import { useCountUp } from '../hooks/useCountUp'

function AnimatedStat({ label, value, prefix = '', suffix = '', icon: Icon, color = 'text-accent', delay = 0 }: {
  label: string; value: number; prefix?: string; suffix?: string
  icon: any; color?: string; delay?: number
}) {
  const animated = useCountUp(Math.round(value), 800)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="bg-card border border-border rounded-xl p-5 card-glow"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon size={16} className={color} />
        <p className="text-text-secondary text-sm">{label}</p>
      </div>
      <p className={`text-3xl font-bold ${color}`}>
        {prefix}{animated.toLocaleString()}{suffix}
      </p>
    </motion.div>
  )
}

export function ROICalculator() {
  const [devCount, setDevCount] = useState(20)
  const [meetingsPerWeek, setMeetingsPerWeek] = useState(3)
  const [hourlyRate, setHourlyRate] = useState(180)

  const meetingCost = devCount * meetingsPerWeek * 1.5 * 4.3 * hourlyRate
  const savings = meetingCost * 0.6
  const devpulseCost = 150 * devCount
  const paybackWeeks = devpulseCost > 0 ? Math.ceil(devpulseCost / (savings / 4.3)) : 0
  const annualROI = devpulseCost > 0 ? Math.round(((savings * 12 - devpulseCost * 12) / (devpulseCost * 12)) * 100) : 0

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">See what DevPulse saves you</h1>
        <p className="text-text-secondary text-sm mt-1">Based on your team size and meeting habits</p>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Number of developers', value: devCount, setter: setDevCount, min: 1, max: 200, unit: 'devs' },
          { label: 'Status meetings per week', value: meetingsPerWeek, setter: setMeetingsPerWeek, min: 1, max: 20, unit: '/week' },
          { label: 'Average hourly rate', value: hourlyRate, setter: setHourlyRate, min: 50, max: 500, unit: '₪/hr' },
        ].map(({ label, value, setter, min, max, unit }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-5"
          >
            <p className="text-text-secondary text-sm mb-4">{label}</p>
            <div className="flex items-end gap-3 mb-4">
              <span className="text-4xl font-bold text-text-primary">{value}</span>
              <span className="text-text-secondary text-sm mb-1">{unit}</span>
            </div>
            <input
              type="range" min={min} max={max} value={value}
              onChange={e => setter(Number(e.target.value))}
              className="w-full accent-indigo-500 h-1.5 rounded-full appearance-none bg-border cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              <span className="text-text-secondary text-xs">{min}</span>
              <span className="text-text-secondary text-xs">{max}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Output cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <AnimatedStat label="Monthly meeting cost" value={meetingCost} prefix="₪" icon={DollarSign} color="text-danger" delay={0} />
        <AnimatedStat label="Monthly savings with DevPulse" value={savings} prefix="₪" icon={TrendingUp} color="text-success" delay={0.05} />
        <AnimatedStat label="Pays for itself in" value={paybackWeeks} suffix=" weeks" icon={Calendar} color="text-accent" delay={0.1} />
        <AnimatedStat label="Annual ROI" value={annualROI} suffix="%" icon={Zap} color="text-warning" delay={0.15} />
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border border-accent/30 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6"
      >
        <div>
          <h2 className="text-text-primary text-xl font-bold mb-2">Ready to reclaim your team's time?</h2>
          <p className="text-text-secondary text-sm">Join 200+ engineering teams already using DevPulse AI to eliminate the Status Gap.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 bg-accent text-white font-semibold px-6 py-3 rounded-xl text-sm whitespace-nowrap"
        >
          Start Free Trial <ArrowRight size={16} />
        </motion.button>
      </motion.div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/pages/ROICalculator.tsx
git commit -m "feat: ROI Calculator page with animated sliders and output cards"
```

---

### Task 13: Final verification

**Step 1: Run dev server and verify all 5 pages load**

```bash
npm run dev
```

Visit each route: `/`, `/sprint`, `/briefing`, `/burnout`, `/roi`

Expected: all pages render without console errors, role switch re-renders content, animations play on load

**Step 2: Run build to verify no TypeScript errors**

```bash
npm run build
```

Expected: build succeeds with no errors

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat: DevPulse AI — complete 5-page engineering intelligence dashboard"
```
