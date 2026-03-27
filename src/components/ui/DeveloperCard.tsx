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
