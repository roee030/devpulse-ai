// src/components/ui/DeveloperCard.tsx
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitPullRequest, CheckCircle, AlertCircle, Clock, ChevronDown,
  TrendingUp, TrendingDown, Minus, CircleDot, Zap
} from 'lucide-react'
import { Developer, Task } from '../../data/mockData'
import { RiskBadge } from './RiskBadge'

const borderColor: Record<string, string> = {
  healthy:  'border-l-success',
  watch:    'border-l-warning',
  'at-risk':'border-l-danger',
  critical: 'border-l-danger',
}

function TaskStatusIcon({ status }: { status: Task['status'] }) {
  if (status === 'blocked')     return <AlertCircle size={12} className="text-danger mt-0.5 flex-shrink-0" />
  if (status === 'in-progress') return <Clock       size={12} className="text-warning mt-0.5 flex-shrink-0" />
  if (status === 'done')        return <CheckCircle size={12} className="text-success mt-0.5 flex-shrink-0" />
  return <CircleDot size={12} className="text-text-secondary mt-0.5 flex-shrink-0" />
}

function TaskStatusBadge({ status }: { status: Task['status'] }) {
  const map: Record<Task['status'], string> = {
    blocked:       'bg-danger/10 text-danger border border-danger/20',
    'in-progress': 'bg-warning/10 text-warning border border-warning/20',
    done:          'bg-success/10 text-success border border-success/20',
    todo:          'bg-border/50 text-text-secondary',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 ${map[status]}`}>
      {status === 'in-progress' ? 'in progress' : status}
    </span>
  )
}

function PRStatusBadge({ status }: { status: 'open' | 'approved' | 'changes-requested' }) {
  const map = {
    open:               'bg-accent/10 text-accent border border-accent/20',
    approved:           'bg-success/10 text-success border border-success/20',
    'changes-requested':'bg-danger/10 text-danger border border-danger/20',
  }
  const label = { open: 'open', approved: 'approved', 'changes-requested': 'review' }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 ${map[status]}`}>
      {label[status]}
    </span>
  )
}

function VelocityIcon({ trend }: { trend: Developer['velocityTrend'] }) {
  if (trend === 'up')   return <TrendingUp   size={12} className="text-success flex-shrink-0" />
  if (trend === 'down') return <TrendingDown size={12} className="text-danger  flex-shrink-0" />
  return <Minus size={12} className="text-text-secondary flex-shrink-0" />
}

interface DeveloperCardProps {
  dev: Developer
  delay?: number
  expanded?: boolean
  onToggle?: () => void
}

export function DeveloperCard({ dev, delay = 0, expanded = false, onToggle }: DeveloperCardProps) {
  const focusTasks = dev.tasks.filter(t => t.status !== 'done').slice(0, 3)
  const hasBlocker  = dev.tasks.some(t => t.status === 'blocked')
  const isExpandable = !!onToggle

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`bg-card border border-border border-l-4 ${borderColor[dev.riskLevel]} rounded-xl overflow-hidden card-glow`}
    >
      {/* ── Summary (always visible) ─────────────────────────────────── */}
      <div className="p-4 md:p-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
            <span className="text-accent text-sm font-bold">{dev.initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-text-primary font-semibold text-sm truncate">{dev.name}</p>
            <p className="text-text-secondary text-xs truncate">{dev.role}</p>
          </div>
          <RiskBadge level={dev.riskLevel} />
          {isExpandable && (
            <button
              onClick={onToggle}
              className="ml-1 text-text-secondary hover:text-text-primary transition-colors p-1 -mr-1"
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
              aria-expanded={expanded}
            >
              <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} />
              </motion.div>
            </button>
          )}
        </div>

        {/* Focus tasks */}
        <div className="mb-4">
          <p className="text-text-secondary text-xs font-medium mb-2 uppercase tracking-wide">Today's focus</p>
          <div className="space-y-2">
            {focusTasks.map(task => (
              <div key={task.id} className="flex items-start gap-2">
                <TaskStatusIcon status={task.status} />
                <span className="text-text-primary text-xs leading-relaxed flex-1 min-w-0">{task.title}</span>
                <span className="text-text-secondary text-xs flex-shrink-0 ml-1">{task.points}pt</span>
              </div>
            ))}
            {focusTasks.length === 0 && (
              <p className="text-text-secondary text-xs italic">No active tasks</p>
            )}
          </div>
        </div>

        {/* PR status */}
        {dev.prStatus && (
          <div className="border-t border-border pt-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <GitPullRequest size={13} className="text-accent flex-shrink-0" />
              <span className="text-text-secondary text-xs flex-1 min-w-0 truncate">
                PR #{dev.prStatus.number}
                {dev.prStatus.waitingHours >= 12
                  ? ` · waiting ${dev.prStatus.waitingHours}h`
                  : ` · ${dev.prStatus.status}`}
              </span>
              <PRStatusBadge status={dev.prStatus.status} />
            </div>
          </div>
        )}

        {/* Blocker / on-track footer */}
        <div className={`flex items-center gap-2 text-xs ${hasBlocker ? 'text-danger' : 'text-success'}`}>
          {hasBlocker
            ? <><AlertCircle size={12} /><span>Blocked task needs attention</span></>
            : <><CheckCircle size={12} /><span>On track — keep it up</span></>
          }
        </div>
      </div>

      {/* ── Expanded detail panel ─────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expansion"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-border" />
            <div className="p-4 md:p-5 space-y-5">

              {/* All Tasks */}
              <div>
                <p className="text-text-secondary text-xs font-medium uppercase tracking-wide mb-2">All Tasks</p>
                <div className="space-y-2">
                  {dev.tasks.map(task => (
                    <div key={task.id} className="flex items-start gap-2">
                      <TaskStatusIcon status={task.status} />
                      <span className="text-text-primary text-xs leading-relaxed flex-1 min-w-0">{task.title}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
                        <span className="text-text-secondary text-xs">{task.points}pt</span>
                        <TaskStatusBadge status={task.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open PR */}
              {dev.prStatus && (
                <div>
                  <p className="text-text-secondary text-xs font-medium uppercase tracking-wide mb-2">Open PR</p>
                  <div className="bg-bg rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <GitPullRequest size={13} className="text-accent flex-shrink-0" />
                      <span className="text-text-primary text-xs font-medium">#{dev.prStatus.number}</span>
                      <PRStatusBadge status={dev.prStatus.status} />
                    </div>
                    <p className="text-text-secondary text-xs leading-relaxed">{dev.prStatus.title}</p>
                    <div className="flex gap-4 text-xs text-text-secondary flex-wrap">
                      <span>Waiting <span className="text-text-primary font-medium">{dev.prStatus.waitingHours}h</span></span>
                      <span>Reviewer <span className="text-text-primary font-medium">{dev.prStatus.reviewer}</span></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Risk Signals */}
              <div>
                <p className="text-text-secondary text-xs font-medium uppercase tracking-wide mb-2">Risk Signals</p>
                <div className="bg-bg rounded-lg p-3 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <RiskBadge level={dev.riskLevel} />
                    <span className="text-text-secondary text-xs leading-relaxed">{dev.riskSignal}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Zap size={11} className="text-accent" />
                      <span className="text-text-primary font-medium">{dev.velocity}</span> pt/day
                    </span>
                    <span className="flex items-center gap-1">
                      <VelocityIcon trend={dev.velocityTrend} />
                      {dev.velocityTrend}
                    </span>
                    <span>Commits: <span className="text-text-primary">{dev.commitPattern}</span></span>
                  </div>
                  <div className="text-xs text-text-secondary">
                    Last active: <span className="text-text-primary">{dev.lastActive}</span>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
