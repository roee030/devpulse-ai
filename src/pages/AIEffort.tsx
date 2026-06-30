// src/pages/AIEffort.tsx
// Displays per-task AI token usage fetched from the local DevPulse agent.
// Falls back to synthetic demo data when the agent is offline.
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Cpu, GitBranch, Zap, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TaskEffort {
  taskId:  string
  tokens:  number
  events:  number
}

interface AgentStatus {
  branch:      string
  taskId:      string | null
  todayTokens: number
  todayEvents: number
  summary:     Record<string, { tokens: number; events: number }>
}

// ── Synthetic fallback data ────────────────────────────────────────────────────

const DEMO_SUMMARY: Record<string, { tokens: number; events: number }> = {
  'PROJ-42':  { tokens: 18_420, events: 23 },
  'PROJ-38':  { tokens: 11_850, events: 14 },
  'PROJ-51':  { tokens:  8_310, events: 11 },
  'PROJ-29':  { tokens:  6_440, events:  8 },
  'PROJ-61':  { tokens:  4_920, events:  6 },
  '(unattributed)': { tokens: 2_100, events: 3 },
}

const DEMO_STATUS: AgentStatus = {
  branch:      'feature/PROJ-42-auth-refactor',
  taskId:      'PROJ-42',
  todayTokens: 3_240,
  todayEvents: 4,
  summary:     DEMO_SUMMARY,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const AGENT = 'http://localhost:9339'

function tokLabel(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function estimateCost(tokens: number) {
  // GPT-4o pricing: ~$5/1M input tokens (rough estimate)
  return `$${((tokens / 1_000_000) * 5).toFixed(3)}`
}

// ── Component ──────────────────────────────────────────────────────────────────

export function AIEffort() {
  const [status,   setStatus]   = useState<AgentStatus | null>(null)
  const [isLive,   setIsLive]   = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  async function fetchStatus() {
    try {
      const r = await fetch(`${AGENT}/status`, { signal: AbortSignal.timeout(2000) })
      if (r.ok) {
        const d = await r.json() as AgentStatus
        setStatus(d)
        setIsLive(true)
        setLastSync(new Date())
        return
      }
    } catch { /* agent offline */ }
    setStatus(DEMO_STATUS)
    setIsLive(false)
    setLastSync(new Date())
  }

  useEffect(() => {
    setLoading(true)
    fetchStatus().finally(() => setLoading(false))
    const id = setInterval(fetchStatus, 10_000)
    return () => clearInterval(id)
  }, [])

  const tasks: TaskEffort[] = Object.entries(status?.summary ?? {})
    .map(([taskId, s]) => ({ taskId, ...s }))
    .sort((a, b) => b.tokens - a.tokens)

  const totalTokens = tasks.reduce((s, t) => s + t.tokens, 0)
  const maxTokens   = tasks[0]?.tokens ?? 1

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-3 text-text-secondary">
        <RefreshCw size={16} className="animate-spin" />
        <span>Connecting to DevPulse agent…</span>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-text-primary text-2xl font-bold flex items-center gap-2">
            <Cpu size={22} className="text-accent" />
            AI Effort per Task
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Copilot token usage attributed to Jira tasks via git branch
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {isLive ? (
            <span className="flex items-center gap-1.5 text-success font-medium">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Agent live
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-warning font-medium">
              <AlertCircle size={12} />
              Demo data
            </span>
          )}
          <button
            onClick={() => fetchStatus()}
            className="p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Active session banner */}
      {status?.taskId && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-accent/10 border border-accent/25 rounded-xl p-4 flex items-center gap-4"
        >
          <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
            <Zap size={16} className="text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary text-sm font-semibold">Active session</p>
            <p className="text-text-secondary text-xs flex items-center gap-1.5 mt-0.5 truncate">
              <GitBranch size={11} />
              {status.branch}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-accent font-bold text-lg font-mono">
              {tokLabel(status.todayTokens ?? 0)}
            </p>
            <p className="text-text-secondary text-xs">today</p>
          </div>
        </motion.div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total tokens',    value: tokLabel(totalTokens),        icon: Cpu },
          { label: 'Tasks with AI',   value: String(tasks.filter(t => t.taskId !== '(unattributed)').length), icon: TrendingUp },
          { label: 'Est. cost',       value: estimateCost(totalTokens),    icon: Zap },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <Icon size={14} className="text-accent mb-2" />
            <p className="text-text-primary text-xl font-bold font-mono">{value}</p>
            <p className="text-text-secondary text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Per-task breakdown */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-text-primary font-semibold text-sm">Token usage per task</h2>
          {lastSync && (
            <span className="text-text-secondary text-xs">
              Updated {lastSync.toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="divide-y divide-border">
          {tasks.map((t, i) => {
            const pct = (t.tokens / maxTokens) * 100
            const isUnattributed = t.taskId === '(unattributed)'
            return (
              <motion.div
                key={t.taskId}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="px-5 py-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                      isUnattributed
                        ? 'bg-border text-text-secondary'
                        : 'bg-accent/15 text-accent'
                    }`}>
                      {t.taskId}
                    </span>
                    <span className="text-text-secondary text-xs truncate">
                      {t.events} calls · {estimateCost(t.tokens)}
                    </span>
                  </div>
                  <span className="text-text-primary font-bold text-sm font-mono shrink-0 ml-4">
                    {tokLabel(t.tokens)}
                  </span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${isUnattributed ? 'bg-border-strong' : 'bg-accent'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: i * 0.05 }}
                  />
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Setup instructions when agent offline */}
      {!isLive && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <h3 className="text-text-primary font-semibold text-sm flex items-center gap-2">
            <AlertCircle size={14} className="text-warning" />
            Connect the DevPulse agent for live tracking
          </h3>
          <div className="space-y-2 text-xs text-text-secondary">
            <p><span className="text-accent font-semibold">1. Start agent</span> (runs on port 9339)</p>
            <pre className="bg-bg border border-border rounded-lg px-3 py-2 text-text-primary font-mono overflow-x-auto">
              npx tsx agent/devpulse-agent.ts
            </pre>
            <p className="mt-3"><span className="text-accent font-semibold">2. Install browser extension</span> for GitHub.com / VS Code Web</p>
            <p className="pl-3">Chrome: chrome://extensions → Load unpacked → select <code>extension/</code></p>
            <p className="mt-3"><span className="text-accent font-semibold">3. For VS Code Desktop</span> add to <code>.vscode/settings.json</code>:</p>
            <pre className="bg-bg border border-border rounded-lg px-3 py-2 text-text-primary font-mono overflow-x-auto">
{`"http.proxy": "http://localhost:9339"`}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
