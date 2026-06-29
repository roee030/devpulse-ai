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
  return Array.from({ length: 4 }, () =>
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

// ─── Health Breakdown ─────────────────────────────────────────────────────────
export interface HealthBreakdownData {
  jiraScore: number
  githubScore: number
  onTimePct: number
  blockedTasks: number
  prMergeRate: number
  avgVelocity: number
  stalePRs: number
  completedPoints: number
  totalPoints: number
}

export function getAvgVelocityForTeam(teamId: string): number {
  const devs = getDevelopersByTeam(teamId)
  if (!devs.length) return 0
  return Math.round((devs.reduce((s, d) => s + d.velocity, 0) / devs.length) * 10) / 10
}

export function getAvgVelocityForDivision(divisionId: string): number {
  const devs = getDevelopersByDivision(divisionId)
  if (!devs.length) return 0
  return Math.round((devs.reduce((s, d) => s + d.velocity, 0) / devs.length) * 10) / 10
}

export function getHealthBreakdown(
  entity: { stalePRs: number; atRiskTasks: number; completedPoints: number; totalPoints: number },
  avgVelocity: number
): HealthBreakdownData {
  const onTimePct = entity.totalPoints === 0
    ? 0
    : Math.round((entity.completedPoints / entity.totalPoints) * 100)
  const jiraScore = onTimePct
  // Approximate totalPRs: assume activePRs = stalePRs * 3 (at least 5)
  const activePRs = Math.max(5, entity.stalePRs * 3)
  const totalPRs = entity.stalePRs + activePRs
  const prMergeRate = Math.round((activePRs / totalPRs) * 100)
  const velocityScore = Math.round(Math.min(avgVelocity / 8, 1) * 100)
  const githubScore = Math.round((prMergeRate + velocityScore) / 2)
  return {
    jiraScore,
    githubScore,
    onTimePct,
    blockedTasks: entity.atRiskTasks,
    prMergeRate,
    avgVelocity,
    stalePRs: entity.stalePRs,
    completedPoints: entity.completedPoints,
    totalPoints: entity.totalPoints,
  }
}

export const velocityHistory = [
  { sprint: 'S1', points: 42 },
  { sprint: 'S2', points: 38 },
  { sprint: 'S3', points: 51 },
]

export const roiHistory = [
  { month: 'Jan', saved: 12000, invested: 4000 },
  { month: 'Feb', saved: 15000, invested: 4000 },
  { month: 'Mar', saved: 18000, invested: 4000 },
]

// ─── AI Effort Data ───────────────────────────────────────────────────────────
export interface DeveloperAiProfile {
  devId: string
  aiCreditsPerDay: number[]   // last 7 days Mon→Sun
  aiEffortScore: number       // credits per story point this week
  efficiencyTrend: 'up' | 'down' | 'stable'
  topAiModules: string[]
}

export const developerAiProfiles: DeveloperAiProfile[] = [
  { devId: 'dev-1',  aiCreditsPerDay: [45, 52, 38, 67, 43, 28, 51], aiEffortScore: 8.2,  efficiencyTrend: 'stable', topAiModules: ['JWT', 'Auth Middleware'] },
  { devId: 'dev-2',  aiCreditsPerDay: [30, 25, 35, 28, 32, 20, 27], aiEffortScore: 5.4,  efficiencyTrend: 'up',     topAiModules: ['Redis', 'Session Store'] },
  { devId: 'dev-3',  aiCreditsPerDay: [120, 145, 98, 167, 89, 52, 134], aiEffortScore: 24.1, efficiencyTrend: 'down', topAiModules: ['Payment Gateway', 'Webhooks'] },
  { devId: 'dev-4',  aiCreditsPerDay: [22, 18, 25, 30, 21, 15, 20], aiEffortScore: 4.1,  efficiencyTrend: 'up',     topAiModules: ['SQL', 'Orders API'] },
  { devId: 'dev-5',  aiCreditsPerDay: [85, 92, 78, 110, 65, 45, 88], aiEffortScore: 19.8, efficiencyTrend: 'down',  topAiModules: ['Auth API', 'Input Validation'] },
  { devId: 'dev-6',  aiCreditsPerDay: [35, 42, 38, 45, 30, 22, 40], aiEffortScore: 6.2,  efficiencyTrend: 'stable', topAiModules: ['Terraform', 'K8s'] },
  { devId: 'dev-7',  aiCreditsPerDay: [18, 12, 22, 15, 8, 5, 10],   aiEffortScore: 3.8,  efficiencyTrend: 'down',   topAiModules: ['CI Pipeline', 'GitHub Actions'] },
  { devId: 'dev-8',  aiCreditsPerDay: [28, 32, 25, 35, 29, 20, 30], aiEffortScore: 5.8,  efficiencyTrend: 'up',     topAiModules: ['SRE', 'Alerting'] },
  { devId: 'dev-9',  aiCreditsPerDay: [40, 38, 45, 42, 35, 25, 38], aiEffortScore: 7.5,  efficiencyTrend: 'stable', topAiModules: ['Helm Charts', 'K8s'] },
  { devId: 'dev-10', aiCreditsPerDay: [55, 48, 62, 50, 45, 30, 52], aiEffortScore: 7.8,  efficiencyTrend: 'up',     topAiModules: ['Checkout UI', 'React'] },
  { devId: 'dev-11', aiCreditsPerDay: [95, 110, 88, 125, 72, 40, 105], aiEffortScore: 22.5, efficiencyTrend: 'down', topAiModules: ['Safari Compat', 'Auth Redirect'] },
  { devId: 'dev-12', aiCreditsPerDay: [25, 22, 28, 30, 24, 18, 26], aiEffortScore: 5.2,  efficiencyTrend: 'stable', topAiModules: ['Dark Mode', 'CSS'] },
  { devId: 'dev-13', aiCreditsPerDay: [42, 45, 38, 48, 40, 28, 43], aiEffortScore: 8.8,  efficiencyTrend: 'stable', topAiModules: ['Analytics Events', 'A/B Tests'] },
  { devId: 'dev-14', aiCreditsPerDay: [60, 55, 65, 58, 52, 35, 58], aiEffortScore: 11.5, efficiencyTrend: 'down',   topAiModules: ['Table Components', 'React'] },
  { devId: 'dev-15', aiCreditsPerDay: [48, 52, 45, 55, 43, 30, 50], aiEffortScore: 7.2,  efficiencyTrend: 'up',     topAiModules: ['iOS Payment', 'StoreKit'] },
  { devId: 'dev-16', aiCreditsPerDay: [15, 8, 12, 5, 3, 0, 8],     aiEffortScore: 2.8,  efficiencyTrend: 'down',   topAiModules: ['Android Auth', 'Biometrics'] },
  { devId: 'dev-17', aiCreditsPerDay: [35, 38, 32, 40, 33, 22, 36], aiEffortScore: 6.8,  efficiencyTrend: 'stable', topAiModules: ['CI Pipeline', 'E2E Tests'] },
  { devId: 'dev-18', aiCreditsPerDay: [20, 18, 22, 25, 19, 12, 21], aiEffortScore: 4.2,  efficiencyTrend: 'up',     topAiModules: ['Onboarding UX', 'Mobile'] },
  { devId: 'dev-19', aiCreditsPerDay: [45, 50, 42, 55, 48, 32, 47], aiEffortScore: 7.4,  efficiencyTrend: 'up',     topAiModules: ['ETL Pipeline', 'Redshift'] },
  { devId: 'dev-20', aiCreditsPerDay: [38, 35, 42, 40, 36, 25, 39], aiEffortScore: 6.5,  efficiencyTrend: 'stable', topAiModules: ['dbt Models', 'SQL'] },
  { devId: 'dev-21', aiCreditsPerDay: [12, 15, 8, 10, 5, 2, 8],    aiEffortScore: 2.5,  efficiencyTrend: 'down',   topAiModules: ['Kafka', 'Event Streaming'] },
  { devId: 'dev-22', aiCreditsPerDay: [18, 20, 16, 22, 17, 10, 19], aiEffortScore: 3.8,  efficiencyTrend: 'up',     topAiModules: ['Airflow DAGs', 'ETL'] },
  { devId: 'dev-23', aiCreditsPerDay: [65, 70, 60, 75, 62, 45, 68], aiEffortScore: 9.8,  efficiencyTrend: 'stable', topAiModules: ['ML Training', 'PyTorch'] },
  { devId: 'dev-24', aiCreditsPerDay: [88, 95, 82, 105, 78, 50, 92], aiEffortScore: 16.2, efficiencyTrend: 'down',  topAiModules: ['Feature Store', 'MLflow'] },
  { devId: 'dev-25', aiCreditsPerDay: [30, 28, 32, 35, 28, 18, 30], aiEffortScore: 5.8,  efficiencyTrend: 'up',     topAiModules: ['Data Preprocessing', 'Pandas'] },
]

export const getDeveloperAiProfile = (devId: string) =>
  developerAiProfiles.find(p => p.devId === devId)

// ─── Roadmap Epics ─────────────────────────────────────────────────────────────
// Week numbers for 2026: Q1 = 1-13, Q2 = 14-26, Q3 = 27-39, Q4 = 40-52
// Current week ≈ 26 (June 29, 2026)
export type EpicStatus = 'completed' | 'on-track' | 'at-risk' | 'delayed'

export interface RippleCard {
  id: string
  quarter: string
  timeframe: string
  title: string
  consequence: string
  severity: 'danger' | 'warn' | 'business'
}

export interface Epic {
  id: string
  title: string
  owner: string
  teamId: string
  startWeek: number
  endWeek: number
  status: EpicStatus
  category: string
  description: string
  rippleChain?: RippleCard[]
}

export const epics: Epic[] = [
  {
    id: 'epic-1', title: 'Auth System Refactor', owner: 'Avi Shapiro', teamId: 'team-backend',
    startWeek: 1, endWeek: 10, status: 'completed', category: 'Platform',
    description: 'Migrate to JWT with refresh token rotation',
  },
  {
    id: 'epic-2', title: 'CI/CD Pipeline Upgrade', owner: 'Dana Mizrahi', teamId: 'team-infra',
    startWeek: 2, endWeek: 12, status: 'completed', category: 'Infrastructure',
    description: 'GitHub Actions migration with parallel jobs',
  },
  {
    id: 'epic-3', title: 'Payment Gateway Integration', owner: 'Michal Stern', teamId: 'team-backend',
    startWeek: 8, endWeek: 26, status: 'at-risk', category: 'Platform',
    description: 'Stripe integration with 3DS2 support',
    rippleChain: [
      { id: 'r1', quarter: 'Q2', timeframe: 'Now',      title: 'Payment Gateway delayed 3 weeks',  consequence: 'Auth bug blocking core payment flow — unresolved since Sprint 22', severity: 'danger' },
      { id: 'r2', quarter: 'Q3', timeframe: 'Aug 2026', title: 'Enterprise Tier launch blocked',    consequence: 'Payment is a hard dependency — Enterprise pricing tiers cannot ship without it', severity: 'warn' },
      { id: 'r3', quarter: 'Q4', timeframe: 'Nov 2026', title: 'Enterprise GA at risk',             consequence: 'Sales team committed Q4 pipeline to Enterprise customers. Delay = missed quota.', severity: 'business' },
    ],
  },
  {
    id: 'epic-4', title: 'Mobile Auth & Biometrics', owner: 'Tom Levi', teamId: 'team-mobile',
    startWeek: 10, endWeek: 24, status: 'at-risk', category: 'Product',
    description: 'Face ID / fingerprint login for iOS and Android',
    rippleChain: [
      { id: 'r4', quarter: 'Q2', timeframe: 'Now',      title: 'Android auth token blocked',   consequence: 'Ofer Ben-David blocked 3 days — no commits. Android biometrics cannot proceed.', severity: 'danger' },
      { id: 'r5', quarter: 'Q3', timeframe: 'Aug 2026', title: 'Mobile v2.0 launch delayed',   consequence: 'Biometrics was anchor feature of v2.0. Release pushed to Sep at earliest.', severity: 'warn' },
    ],
  },
  {
    id: 'epic-5', title: 'Developer Portal v1', owner: 'Yael Katz', teamId: 'team-frontend',
    startWeek: 14, endWeek: 26, status: 'on-track', category: 'Product',
    description: 'API documentation and sandbox environment',
  },
  {
    id: 'epic-6', title: 'ML Churn Prediction', owner: 'Paz Gonen', teamId: 'team-ml',
    startWeek: 14, endWeek: 30, status: 'on-track', category: 'Data',
    description: 'Real-time churn risk scoring pipeline',
  },
  {
    id: 'epic-7', title: 'Enterprise Tier Features', owner: 'Roi Friedman', teamId: 'team-backend',
    startWeek: 27, endWeek: 35, status: 'on-track', category: 'Platform',
    description: 'SSO, audit logs, advanced permissions, SLA tiers',
  },
  {
    id: 'epic-8', title: 'API v2 — Public Platform', owner: 'Avi Shapiro', teamId: 'team-backend',
    startWeek: 27, endWeek: 39, status: 'on-track', category: 'Platform',
    description: 'Versioned public API with GraphQL support',
  },
  {
    id: 'epic-9', title: 'Mobile v2.0 Launch', owner: 'Tom Levi', teamId: 'team-mobile',
    startWeek: 30, endWeek: 38, status: 'on-track', category: 'Product',
    description: 'Full rewrite with biometrics and native payment',
  },
  {
    id: 'epic-10', title: 'Data Platform v2', owner: 'Shira Goldberg', teamId: 'team-data-eng',
    startWeek: 35, endWeek: 50, status: 'on-track', category: 'Data',
    description: 'Real-time streaming + self-serve analytics',
  },
  {
    id: 'epic-11', title: 'Enterprise GA Launch', owner: 'Lior Ben-David', teamId: 'team-backend',
    startWeek: 40, endWeek: 48, status: 'on-track', category: 'Business',
    description: 'GA of Enterprise tier with sales enablement',
  },
  {
    id: 'epic-12', title: 'Platform Observability', owner: 'Dana Mizrahi', teamId: 'team-infra',
    startWeek: 40, endWeek: 52, status: 'on-track', category: 'Infrastructure',
    description: 'OpenTelemetry, distributed tracing, SLO dashboards',
  },
]

// ─── Annual View Data ──────────────────────────────────────────────────────────
export interface QuarterSummary {
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  label: string
  dates: string
  healthScore: number
  status: 'completed' | 'current' | 'upcoming'
  initiatives: { name: string; status: 'done' | 'on-track' | 'at-risk' | 'upcoming' }[]
  deliveredPoints: number
  totalPoints: number
}

export const quarterSummaries: QuarterSummary[] = [
  {
    id: 'Q1', label: 'Q1 2026', dates: 'Jan – Mar', healthScore: 82, status: 'completed',
    initiatives: [
      { name: 'Auth System Refactor', status: 'done' },
      { name: 'CI/CD Pipeline Upgrade', status: 'done' },
      { name: 'Frontend Component Library', status: 'done' },
    ],
    deliveredPoints: 186, totalPoints: 200,
  },
  {
    id: 'Q2', label: 'Q2 2026', dates: 'Apr – Jun', healthScore: 68, status: 'current',
    initiatives: [
      { name: 'Payment Gateway Integration', status: 'at-risk' },
      { name: 'Mobile Auth & Biometrics', status: 'at-risk' },
      { name: 'Developer Portal v1', status: 'on-track' },
      { name: 'ML Churn Prediction (started)', status: 'on-track' },
    ],
    deliveredPoints: 142, totalPoints: 210,
  },
  {
    id: 'Q3', label: 'Q3 2026', dates: 'Jul – Sep', healthScore: 74, status: 'upcoming',
    initiatives: [
      { name: 'Enterprise Tier Features', status: 'upcoming' },
      { name: 'API v2 — Public Platform', status: 'upcoming' },
      { name: 'Mobile v2.0 Launch', status: 'upcoming' },
      { name: 'ML Churn Prediction', status: 'upcoming' },
    ],
    deliveredPoints: 0, totalPoints: 230,
  },
  {
    id: 'Q4', label: 'Q4 2026', dates: 'Oct – Dec', healthScore: 70, status: 'upcoming',
    initiatives: [
      { name: 'Enterprise GA Launch', status: 'upcoming' },
      { name: 'Platform Observability', status: 'upcoming' },
      { name: 'Data Platform v2', status: 'upcoming' },
    ],
    deliveredPoints: 0, totalPoints: 220,
  },
]

export const monthlyVelocity = [
  { month: 'Jan', actual: 58,   target: 60 },
  { month: 'Feb', actual: 62,   target: 60 },
  { month: 'Mar', actual: 66,   target: 65 },
  { month: 'Apr', actual: 55,   target: 65 },
  { month: 'May', actual: 48,   target: 65 },
  { month: 'Jun', actual: 39,   target: 65 },
  { month: 'Jul', actual: null, target: 65 },
  { month: 'Aug', actual: null, target: 68 },
  { month: 'Sep', actual: null, target: 68 },
  { month: 'Oct', actual: null, target: 70 },
  { month: 'Nov', actual: null, target: 70 },
  { month: 'Dec', actual: null, target: 70 },
]
