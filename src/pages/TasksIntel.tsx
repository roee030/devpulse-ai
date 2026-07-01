// src/pages/TasksIntel.tsx
// Real-data task intelligence view.
// Shows Jira / Linear / Monday tasks enriched with:
//   - linked GitHub PRs (matched by branch name containing task key)
//   - Slack/Teams messages that mentioned the task key
//   - HRIS developer assigned to the task
// Also generates and posts a daily standup to Slack/Teams.
import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitMerge, GitPullRequest, MessageSquare, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Clock, Filter, Send, Layers,
  ArrowUpRight, RefreshCw, LayoutGrid,
} from 'lucide-react'
import { useUnifiedData } from '../context/UnifiedDataContext'
import { useUser } from '../context/UserContext'
import { postDailyBriefing, generateMarkdownBriefing } from '../lib/dailyBriefing'
import type { EnrichedTask, LinkedPR } from '../context/UnifiedDataContext'

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  'todo':        'bg-border text-text-secondary',
  'in-progress': 'bg-accent/15 text-accent',
  'done':        'bg-success/15 text-success',
  'blocked':     'bg-danger/15 text-danger',
}

const PRIORITY_DOT: Record<string, string> = {
  'critical': 'bg-danger',
  'high':     'bg-warning',
  'medium':   'bg-accent',
  'low':      'bg-border-strong',
}

const PR_STATUS_STYLE: Record<string, string> = {
  'open':               'bg-accent/10 text-accent border border-accent/20',
  'approved':           'bg-success/10 text-success border border-success/20',
  'merged':             'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  'closed':             'bg-border text-text-secondary',
  'changes-requested':  'bg-warning/10 text-warning border border-warning/20',
}

function PRBadge({ pr }: { pr: LinkedPR }) {
  const style  = PR_STATUS_STYLE[pr.status] ?? PR_STATUS_STYLE['open']
  const icon   = pr.status === 'merged' ? GitMerge : GitPullRequest
  const Icon   = icon
  return (
    <a
      href={pr.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${style} hover:opacity-80 transition-opacity`}
    >
      <Icon size={10} />
      #{pr.number}
      {pr.waitingHours > 0 && pr.status !== 'merged' && pr.status !== 'closed' && (
        <span className="opacity-60">· {pr.waitingHours < 24 ? `${pr.waitingHours}h` : `${Math.round(pr.waitingHours / 24)}d`}</span>
      )}
    </a>
  )
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, index }: { task: EnrichedTask; index: number }) {
  const [open, setOpen] = useState(false)

  const hasPRs  = task.prs.length > 0
  const hasMsgs = task.messages.length > 0
  const isStale = !hasPRs && task.status === 'in-progress' && task.daysOpen > 3

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="border-b border-border last:border-0"
    >
      {/* Main row */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-white/[0.02] transition-colors ${
          task.isBlocked ? 'border-l-2 border-danger' : hasPRs ? 'border-l-2 border-accent' : 'border-l-2 border-transparent'
        }`}
      >
        {/* Priority dot */}
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_DOT[task.priority]}`} />

        {/* Task key */}
        <span className="text-accent font-mono text-xs font-semibold shrink-0 w-20">{task.key}</span>

        {/* Title */}
        <span className="flex-1 text-sm text-text-primary truncate">{task.title}</span>

        {/* Badges row */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Status */}
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[task.status]}`}>
            {task.status === 'in-progress' ? 'In Progress' : task.status.charAt(0).toUpperCase() + task.status.slice(1)}
          </span>

          {/* Stale warning */}
          {isStale && (
            <span className="text-[10px] text-warning flex items-center gap-0.5">
              <AlertTriangle size={10} />No PR
            </span>
          )}

          {/* PR count */}
          {hasPRs && (
            <span className="flex items-center gap-1 text-[10px] text-accent">
              <GitPullRequest size={10} />{task.prs.length}
            </span>
          )}

          {/* Message count */}
          {hasMsgs && (
            <span className="flex items-center gap-1 text-[10px] text-text-secondary">
              <MessageSquare size={10} />{task.messages.length}
            </span>
          )}

          {/* Assignee */}
          {task.assigneeDev && (
            <div className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center text-accent text-[9px] font-bold">
              {task.assigneeDev.initials}
            </div>
          )}
          {!task.assigneeDev && task.assigneeName && (
            <span className="text-[10px] text-text-secondary truncate max-w-[60px]">
              {task.assigneeName.split(' ')[0]}
            </span>
          )}

          {/* Days open */}
          <span className="text-[10px] text-text-secondary flex items-center gap-0.5 w-12 text-right">
            <Clock size={9} />{task.daysOpen}d
          </span>

          {/* Expand toggle */}
          <span className="text-text-secondary ml-1">
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pl-[68px] space-y-3">
              {/* Description */}
              {task.description && (
                <p className="text-text-secondary text-xs leading-relaxed line-clamp-3">
                  {task.description}
                </p>
              )}

              {/* PRs */}
              {task.prs.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-text-secondary text-[10px] uppercase tracking-wide font-medium">
                    Pull Requests
                  </p>
                  <div className="space-y-1">
                    {task.prs.map(pr => (
                      <div key={pr.id} className="flex items-center gap-2">
                        <PRBadge pr={pr} />
                        <span className="text-xs text-text-secondary truncate">{pr.title}</span>
                        {pr.sourceBranch && (
                          <span className="text-[10px] text-text-secondary font-mono opacity-50 hidden sm:block">
                            {pr.sourceBranch.slice(0, 40)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {task.messages.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-text-secondary text-[10px] uppercase tracking-wide font-medium">
                    Team Messages
                  </p>
                  <div className="space-y-1">
                    {task.messages.map(msg => (
                      <div key={msg.id} className="flex items-start gap-2 text-xs text-text-secondary">
                        <MessageSquare size={10} className="mt-0.5 shrink-0 text-accent/50" />
                        <span className="line-clamp-2">{msg.text}</span>
                        <span className="text-[9px] shrink-0 opacity-50">
                          {msg.channel && `#${msg.channel}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Source badge + due date */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[9px] uppercase tracking-wider text-text-secondary px-1.5 py-0.5 border border-border rounded">
                  {task.source}
                </span>
                {task.dueAt && (
                  <span className={`text-[10px] ${task.dueAt < new Date() ? 'text-danger' : 'text-text-secondary'}`}>
                    Due {task.dueAt.toLocaleDateString()}
                  </span>
                )}
                {task.epicId && (
                  <span className="text-[10px] text-text-secondary flex items-center gap-0.5">
                    <Layers size={9} />Epic
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Daily standup modal ───────────────────────────────────────────────────────

function StandupModal({
  onClose,
  developers,
  tasks,
  channels,
  slackConnectionId,
}: {
  onClose: () => void
  developers: ReturnType<typeof useUser>['visibleDevelopers']
  tasks: EnrichedTask[]
  channels: import('../context/UnifiedDataContext').UnifiedDataState['allChannels']
  slackConnectionId: string
}) {
  const [channelId, setChannelId] = useState(channels[0]?.id ?? '')
  const [sending, setSending]     = useState(false)
  const [sent, setSent]           = useState(false)
  const md = generateMarkdownBriefing(developers, tasks)

  async function handleSend() {
    if (!slackConnectionId || !channelId) return
    setSending(true)
    const ok = await postDailyBriefing({ connectionId: slackConnectionId, channelId, developers, tasks })
    setSending(false)
    if (ok) { setSent(true); setTimeout(onClose, 2000) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-text-primary font-semibold text-sm flex items-center gap-2">
            <Send size={14} className="text-accent" />
            Post Daily Standup
          </h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary text-sm">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
            {md}
          </pre>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center gap-3">
          {channels.length > 0 ? (
            <select
              value={channelId}
              onChange={e => setChannelId(e.target.value)}
              className="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary"
            >
              {channels.map(c => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          ) : (
            <span className="flex-1 text-xs text-warning">No Slack/Teams channel connected yet</span>
          )}
          <button
            onClick={handleSend}
            disabled={sending || sent || !channels.length}
            className="flex items-center gap-2 bg-accent text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {sent ? <CheckCircle2 size={14} /> : sending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {sent ? 'Sent!' : sending ? 'Sending…' : 'Post to Slack'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type StatusFilter = 'all' | 'todo' | 'in-progress' | 'done' | 'blocked'
type SourceFilter = 'all' | 'jira' | 'linear' | 'monday'

export function TasksIntel() {
  const { enrichedTasks, connections, allPRs, allChannels, slackConnectionId, isLoading, lastFetched } = useUnifiedData()
  const { visibleDevelopers, activeUser } = useUser()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [epicFilter, setEpicFilter] = useState<string>('all')
  const [showStandup, setShowStandup] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)

  // keyboard shortcut: / to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Visible tasks depend on active user's scope
  const scopedTasks = useMemo(() => {
    if (!activeUser) return enrichedTasks
    if (activeUser.role === 'developer') {
      return enrichedTasks.filter(t =>
        t.assigneeDev?.id === activeUser.developerId ||
        visibleDevelopers.some(d => d.id === t.assigneeDev?.id)
      )
    }
    // team lead / CTO see all tasks for their visible developers
    const devIds = new Set(visibleDevelopers.map(d => d.id))
    return enrichedTasks.filter(t =>
      !t.assigneeDev || devIds.has(t.assigneeDev.id)
    )
  }, [enrichedTasks, activeUser, visibleDevelopers])

  const epicIds = useMemo(() => {
    const ids = [...new Set(scopedTasks.map(t => t.epicId).filter(Boolean))] as string[]
    return ids.sort()
  }, [scopedTasks])

  const filtered = useMemo(() => {
    let t = scopedTasks
    if (statusFilter !== 'all') t = t.filter(x => x.status === statusFilter)
    if (sourceFilter !== 'all') t = t.filter(x => x.source === sourceFilter)
    if (assigneeFilter !== 'all') t = t.filter(x => x.assigneeDev?.id === assigneeFilter)
    if (epicFilter !== 'all') t = t.filter(x => x.epicId === epicFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      t = t.filter(x =>
        x.key.toLowerCase().includes(q) ||
        x.title.toLowerCase().includes(q) ||
        x.description.toLowerCase().includes(q)
      )
    }
    return t
  }, [scopedTasks, statusFilter, sourceFilter, assigneeFilter, epicFilter, search])

  // Stats
  const totalLinkedPRs    = filtered.filter(t => t.prs.length > 0).length
  const blockedCount      = filtered.filter(t => t.isBlocked).length
  const stalePRCount      = allPRs.filter(p => p.status === 'open' && p.waitingHours > 24).length
  const noCodeCount       = filtered.filter(t => !t.hasOpenPR && t.status === 'in-progress' && t.daysOpen > 2).length

  const connectedSources = Object.entries(connections)
    .filter(([k, v]) => v && ['jira','linear','monday','github','slack','teams'].includes(k))
    .map(([k]) => k)

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-text-primary text-2xl font-bold flex items-center gap-2">
            <LayoutGrid size={22} className="text-accent" />
            Task Intelligence
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            {enrichedTasks.length} tasks across {connectedSources.filter(s => ['jira','linear','monday'].includes(s)).join(', ') || 'no task source'}
            {totalLinkedPRs > 0 && ` · ${totalLinkedPRs} tasks linked to PRs`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Connection badges */}
          {connectedSources.map(src => (
            <span key={src} className="text-[10px] px-2 py-1 rounded-full bg-success/10 text-success border border-success/20 font-medium">
              {src} ✓
            </span>
          ))}

          {/* Post standup button (only for leads) */}
          {(activeUser?.role === 'teamLead' || activeUser?.role === 'cto' || activeUser?.role === 'divisionHead') && (
            <button
              onClick={() => setShowStandup(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
            >
              <Send size={12} />Post Standup
            </button>
          )}

          {/* Loading state */}
          {isLoading ? (
            <RefreshCw size={13} className="animate-spin text-text-secondary" />
          ) : lastFetched && (
            <span className="text-[10px] text-text-secondary">
              {lastFetched.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total tasks',    value: enrichedTasks.length,  color: 'text-text-primary' },
          { label: 'Linked to PRs',  value: totalLinkedPRs,        color: 'text-accent' },
          { label: 'Blocked',        value: blockedCount,           color: blockedCount > 0 ? 'text-danger' : 'text-text-primary' },
          { label: 'PRs stale >24h', value: stalePRCount,          color: stalePRCount > 0 ? 'text-warning' : 'text-text-primary' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            <p className="text-text-secondary text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* No-code alert */}
      {noCodeCount > 0 && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl px-4 py-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-warning shrink-0" />
          <p className="text-sm text-warning">
            <strong>{noCodeCount}</strong> in-progress task{noCodeCount !== 1 ? 's' : ''} open {'>'}2 days with no PR — may be stuck
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={13} className="text-text-secondary" />

        {/* Search */}
        <input
          ref={searchRef}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search tasks… (/)"
          className="bg-card border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary w-48 focus:outline-none focus:border-accent/50"
        />

        {/* Status filter */}
        {(['all','todo','in-progress','done','blocked'] as StatusFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              statusFilter === s
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-text-secondary hover:text-text-primary bg-card border border-border'
            }`}
          >
            {s === 'all' ? 'All' : s === 'in-progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}

        {/* Source filter */}
        {(['all','jira','linear','monday'] as SourceFilter[]).map(s => (
          <button
            key={s}
            onClick={() => setSourceFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              sourceFilter === s
                ? 'bg-accent/15 text-accent border border-accent/30'
                : 'text-text-secondary hover:text-text-primary bg-card border border-border'
            }`}
          >
            {s === 'all' ? 'All sources' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}

        {/* Assignee filter */}
        {visibleDevelopers.length > 1 && (
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-3 py-1.5 text-text-secondary"
          >
            <option value="all">All developers</option>
            {visibleDevelopers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        )}

        {/* Epic filter */}
        {epicIds.length > 0 && (
          <select
            value={epicFilter}
            onChange={e => setEpicFilter(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-3 py-1.5 text-text-secondary"
          >
            <option value="all">All epics</option>
            {epicIds.map(id => (
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
        )}

        <span className="ml-auto text-xs text-text-secondary">{filtered.length} tasks</span>
      </div>

      {/* Task list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Column headers */}
        <div className="px-5 py-2.5 border-b border-border bg-bg/50 hidden md:flex items-center gap-3 text-[10px] text-text-secondary uppercase tracking-wide font-medium">
          <span className="w-1.5 shrink-0" />
          <span className="w-20 shrink-0">Key</span>
          <span className="flex-1">Title</span>
          <span className="w-24 text-right">Status · PRs · Age</span>
        </div>

        {isLoading ? (
          <div className="px-5 py-12 flex items-center justify-center gap-2 text-text-secondary">
            <RefreshCw size={16} className="animate-spin" />
            <span className="text-sm">Loading live data from Jira &amp; GitHub…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center space-y-2">
            <p className="text-text-secondary text-sm">No tasks match these filters</p>
            {enrichedTasks.length === 0 && (
              <p className="text-text-secondary text-xs">
                Connect Jira, Linear, or Monday in{' '}
                <a href="/devpulse-ai/settings/integrations" className="text-accent">Integrations</a>
              </p>
            )}
          </div>
        ) : (
          filtered.map((task, i) => <TaskRow key={task.id} task={task} index={i} />)
        )}
      </div>

      {/* PRs with no task — orphaned PRs */}
      {allPRs.filter(p => !p.linkedTaskKey && p.status === 'open').length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border text-xs text-text-secondary font-medium uppercase tracking-wide flex items-center gap-2">
            <ArrowUpRight size={12} className="text-warning" />
            Open PRs not linked to any task
          </div>
          {allPRs
            .filter(p => !p.linkedTaskKey && p.status === 'open')
            .slice(0, 8)
            .map(pr => (
              <div key={pr.id} className="px-5 py-2.5 border-b border-border last:border-0 flex items-center gap-3">
                <GitPullRequest size={12} className="text-text-secondary shrink-0" />
                <span className="text-xs font-mono text-text-secondary w-10">#{pr.number}</span>
                <span className="text-xs text-text-primary flex-1 truncate">{pr.title || pr.sourceBranch}</span>
                <span className="text-xs text-text-secondary">
                  {pr.waitingHours < 24 ? `${pr.waitingHours}h` : `${Math.round(pr.waitingHours / 24)}d`} open
                </span>
                <span className="text-[10px] text-warning">No task link</span>
              </div>
            ))}
        </div>
      )}

      {/* Standup modal */}
      <AnimatePresence>
        {showStandup && (
          <StandupModal
            onClose={() => setShowStandup(false)}
            developers={visibleDevelopers}
            tasks={enrichedTasks}
            channels={allChannels}
            slackConnectionId={slackConnectionId}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
