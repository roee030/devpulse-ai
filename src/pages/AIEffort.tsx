// src/pages/AIEffort.tsx
// Team-level AI effort dashboard.
// Team leads see all developers under them; CTO sees the whole org.
// Data flows: agent/browser-extension → Firebase → here.
// Falls back to synthetic demo data (using real task keys when available).
import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Cpu, GitBranch, Zap, TrendingUp, AlertCircle, RefreshCw, Users, ChevronDown, ChevronUp, Download } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { useUnifiedData } from '../context/UnifiedDataContext'
import {
  makeDemoEvents, aggregateByTask, aggregateByDeveloper, fetchTeamEvents,
  type AIEffortEvent, type TaskEffortSummary, type DeveloperEffortSummary,
} from '../lib/aiEffortStore'
import { AiInsightCard } from '../components/ui/AiInsightCard'
import { computeAIEffortInsight } from '../lib/insights'

// ── Helpers ────────────────────────────────────────────────────────────────────

const AGENT = 'http://localhost:9339'

function tokLabel(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function costLabel(tokens: number) {
  return `$${((tokens / 1_000_000) * 5).toFixed(3)}`
}

function pct(n: number, max: number) {
  return max === 0 ? 0 : Math.round((n / max) * 100)
}

type Period = '1d' | '7d' | '30d'
const PERIOD_DAYS: Record<Period, number> = { '1d': 1, '7d': 7, '30d': 30 }
const PERIOD_LABEL: Record<Period, string> = { '1d': 'Today', '7d': 'This week', '30d': 'This month' }

// ── Sub-components ─────────────────────────────────────────────────────────────

function DevRow({ dev, rank, max }: { dev: DeveloperEffortSummary; rank: number; max: number }) {
  const [open, setOpen] = useState(false)
  const bar = pct(dev.totalTokens, max)

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <span className="text-text-secondary text-xs font-mono w-4 shrink-0">{rank}</span>

        {/* avatar */}
        <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
          <span className="text-accent text-xs font-bold">
            {(dev.userName ?? '?').split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-primary text-sm font-medium truncate">{dev.userName}</span>
            <span className="text-text-primary font-bold text-sm font-mono shrink-0 ml-3">
              {tokLabel(dev.totalTokens)}
            </span>
          </div>
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${bar}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="shrink-0 text-text-secondary">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {open && (
        <div className="px-5 pb-3 pl-[68px] flex flex-wrap gap-2">
          <span className="text-text-secondary text-xs">{dev.events} calls · {costLabel(dev.totalTokens)}</span>
          {dev.tasks.map(t => (
            <span key={t} className="text-xs font-mono bg-accent/10 text-accent px-2 py-0.5 rounded">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, rank, max }: { task: TaskEffortSummary; rank: number; max: number }) {
  const bar       = pct(task.totalTokens, max)
  const isUnattr  = task.taskId === '(unattributed)'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.04 }}
      className="px-5 py-3.5 border-b border-border last:border-0"
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded shrink-0 ${
            isUnattr ? 'bg-border text-text-secondary' : 'bg-accent/15 text-accent'
          }`}>
            {task.taskId}
          </span>
          <span className="text-text-secondary text-xs truncate">
            {task.events} calls · {task.developers.slice(0, 3).join(', ')}{task.developers.length > 3 ? ` +${task.developers.length - 3}` : ''}
          </span>
        </div>
        <div className="text-right ml-3 shrink-0">
          <span className="text-text-primary font-bold text-sm font-mono">{tokLabel(task.totalTokens)}</span>
          <span className="text-text-secondary text-xs ml-1.5">{costLabel(task.totalTokens)}</span>
        </div>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isUnattr ? 'bg-border-strong' : 'bg-accent'}`}
          initial={{ width: 0 }}
          animate={{ width: `${bar}%` }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: rank * 0.04 }}
        />
      </div>
    </motion.div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function AIEffort() {
  const { visibleDevelopers, activeUser } = useUser()
  const { enrichedTasks } = useUnifiedData()

  const [events,   setEvents]   = useState<AIEffortEvent[]>([])
  const [isLive,   setIsLive]   = useState(false)
  const [agentOn,  setAgentOn]  = useState(false)
  const [period,   setPeriod]   = useState<Period>('7d')
  const [view,     setView]     = useState<'developers' | 'tasks'>('developers')
  const [loading,  setLoading]  = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  const teamNames = visibleDevelopers.map(d => d.name)
  // Use real task keys from Jira/Linear when available
  const realTaskKeys = useMemo(
    () => enrichedTasks.map(t => t.key).filter(Boolean),
    [enrichedTasks],
  )

  async function loadData() {
    // 1. Try Firebase (real shared data)
    try {
      const fbEvents = await fetchTeamEvents('devpulse', PERIOD_DAYS[period])
      if (fbEvents.length > 0) {
        setEvents(fbEvents)
        setIsLive(true)
        setLastSync(new Date())
        return
      }
    } catch { /* Firebase not configured */ }

    // 2. Try local agent (single-user live data)
    try {
      const r = await fetch(`${AGENT}/events`, { signal: AbortSignal.timeout(1500) })
      if (r.ok) {
        const d = await r.json()
        if ((d.events?.length ?? 0) > 0) {
          setAgentOn(true)
          const since = Date.now() - PERIOD_DAYS[period] * 86_400_000
          setEvents((d.events as AIEffortEvent[]).filter(
            e => new Date(e.timestamp).getTime() > since
          ))
          setLastSync(new Date())
          return
        }
        setAgentOn(true)
      }
    } catch { /* agent offline */ }

    // 3. Synthetic demo data — inject real task keys when Unified.to has them
    setEvents(makeDemoEvents(teamNames, realTaskKeys))
    setLastSync(new Date())
  }

  useEffect(() => {
    setLoading(true)
    loadData().finally(() => setLoading(false))
  }, [period, visibleDevelopers.length, realTaskKeys.length])

  useEffect(() => {
    const id = setInterval(loadData, 15_000)
    return () => clearInterval(id)
  }, [period])

  const byDeveloper: DeveloperEffortSummary[] = useMemo(() => aggregateByDeveloper(events), [events])
  const byTask:      TaskEffortSummary[]      = useMemo(() => aggregateByTask(events),      [events])

  const aiInsightText = useMemo(
    () => computeAIEffortInsight(byDeveloper, byTask),
    [byDeveloper, byTask],
  )

  const totalTokens = events.reduce((s, e) => s + e.totalTokens, 0)
  const taskCount   = byTask.filter(t => t.taskId !== '(unattributed)').length
  const maxDevTok   = byDeveloper[0]?.totalTokens ?? 1
  const maxTaskTok  = byTask[0]?.totalTokens ?? 1

  function downloadCSV() {
    const rows = view === 'developers'
      ? [
          ['Developer', 'Total Tokens', 'Events', 'Tasks', 'Est. Cost'],
          ...byDeveloper.map(d => [d.userName, d.totalTokens, d.events, d.tasks.join('; '), costLabel(d.totalTokens)]),
        ]
      : [
          ['Task ID', 'Total Tokens', 'Developers', 'Est. Cost'],
          ...byTask.map(t => [t.taskId, t.totalTokens, t.developers.join('; '), costLabel(t.totalTokens)]),
        ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `ai-effort-${view}-${period}-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-text-primary text-2xl font-bold flex items-center gap-2">
            <Cpu size={22} className="text-accent" />
            AI Effort per Task
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Copilot token usage across {teamNames.length > 0 ? `${teamNames.length} developers` : 'your team'}
            {activeUser && ` · ${activeUser.role === 'cto' ? 'All org' : activeUser.role === 'divisionHead' ? 'Division' : 'Team'} view`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          {(['1d', '7d', '30d'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                period === p
                  ? 'bg-accent text-white'
                  : 'bg-card border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {PERIOD_LABEL[p]}
            </button>
          ))}

          {/* Status + refresh */}
          <div className="flex items-center gap-1.5 ml-1">
            {isLive ? (
              <span className="flex items-center gap-1 text-[10px] text-success font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />Firebase live
              </span>
            ) : agentOn ? (
              <span className="flex items-center gap-1 text-[10px] text-accent font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />Agent live
              </span>
            ) : (
              <span className="text-[10px] text-warning flex items-center gap-1">
                <AlertCircle size={10} />Demo data
              </span>
            )}
            <button
              onClick={downloadCSV}
              title="Export CSV"
              className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary"
            >
              <Download size={12} />
            </button>
            <button
              onClick={() => loadData()}
              className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total tokens',     value: tokLabel(totalTokens),       icon: Cpu },
          { label: 'Tasks with AI',    value: String(taskCount),           icon: TrendingUp },
          { label: 'Team members',     value: String(byDeveloper.length),  icon: Users },
          { label: 'Est. cost',        value: costLabel(totalTokens),      icon: Zap },
        ].map(({ label, value, icon: Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card border border-border rounded-xl p-4"
          >
            <Icon size={14} className="text-accent mb-2" />
            <p className="text-text-primary text-xl font-bold font-mono">{value}</p>
            <p className="text-text-secondary text-xs mt-0.5">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* AI Insight */}
      <AiInsightCard text={aiInsightText} />

      {/* View toggle */}
      <div className="flex gap-2">
        {(['developers', 'tasks'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg font-medium transition-colors ${
              view === v
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
            }`}
          >
            {v === 'developers' ? <Users size={14} /> : <GitBranch size={14} />}
            {v === 'developers' ? 'By developer' : 'By task'}
          </button>
        ))}
        {lastSync && (
          <span className="ml-auto text-text-secondary text-xs self-center">
            Synced {lastSync.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Main breakdown */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {view === 'developers' ? (
          <>
            <div className="px-5 py-3.5 border-b border-border text-xs text-text-secondary font-medium uppercase tracking-wide">
              Developer · tokens used · tasks
            </div>
            {byDeveloper.map((dev, i) => (
              <DevRow key={dev.userId} dev={dev} rank={i + 1} max={maxDevTok} />
            ))}
            {byDeveloper.length === 0 && (
              <p className="px-5 py-8 text-text-secondary text-sm text-center">No data for this period</p>
            )}
          </>
        ) : (
          <>
            <div className="px-5 py-3.5 border-b border-border text-xs text-text-secondary font-medium uppercase tracking-wide">
              Task · total tokens · developers involved
            </div>
            {byTask.map((task, i) => (
              <TaskRow key={task.taskId} task={task} rank={i} max={maxTaskTok} />
            ))}
            {byTask.length === 0 && (
              <p className="px-5 py-8 text-text-secondary text-sm text-center">No data for this period</p>
            )}
          </>
        )}
      </div>

      {/* Setup instructions */}
      {!isLive && !agentOn && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-text-primary font-semibold text-sm flex items-center gap-2">
            <AlertCircle size={14} className="text-warning" />
            Showing demo data — connect real tracking
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-xs text-text-secondary">
            <div className="space-y-2">
              <p className="text-accent font-semibold">Option A — Browser extension</p>
              <p>Catches every Copilot call in GitHub.com + VS Code Web automatically.</p>
              <pre className="bg-bg border border-border rounded px-3 py-2 text-text-primary font-mono text-[11px]">
chrome://extensions → Load unpacked → extension/
              </pre>
            </div>
            <div className="space-y-2">
              <p className="text-accent font-semibold">Option B — Local agent</p>
              <p>Each developer runs the agent. Data goes to Firebase for team sharing.</p>
              <pre className="bg-bg border border-border rounded px-3 py-2 text-text-primary font-mono text-[11px]">
npx tsx agent/devpulse-agent.ts
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
