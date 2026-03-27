// src/components/ui/HealthBreakdown.tsx
import { motion } from 'framer-motion'
import { HealthBreakdownData } from '../../data/mockData'

function scoreColor(score: number) {
  if (score >= 75) return 'bg-success'
  if (score >= 50) return 'bg-warning'
  return 'bg-danger'
}

function textColor(score: number) {
  if (score >= 75) return 'text-success'
  if (score >= 50) return 'text-warning'
  return 'text-danger'
}

export function HealthBreakdown(props: HealthBreakdownData) {
  const { jiraScore, githubScore, onTimePct, blockedTasks, prMergeRate, avgVelocity, stalePRs } = props

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <div className="mt-3 space-y-4 border-t border-border pt-3">

        {/* Jira Performance */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-secondary text-xs font-medium">Jira Performance</span>
            <span className={`text-xs font-bold ${textColor(jiraScore)}`}>{jiraScore} / 100</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${jiraScore}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full ${scoreColor(jiraScore)}`}
            />
          </div>
          <div className="space-y-1 pl-1">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>On-time completion</span><span>{onTimePct}%</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Blocked / At-risk tasks</span><span>{blockedTasks}</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Sprint completion</span><span>{onTimePct}%</span>
            </div>
          </div>
        </div>

        {/* GitHub Activity */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-text-secondary text-xs font-medium">GitHub Activity</span>
            <span className={`text-xs font-bold ${textColor(githubScore)}`}>{githubScore} / 100</span>
          </div>
          <div className="h-1.5 rounded-full bg-border overflow-hidden mb-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${githubScore}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
              className={`h-full rounded-full ${scoreColor(githubScore)}`}
            />
          </div>
          <div className="space-y-1 pl-1">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>PR merge rate</span><span>{prMergeRate}%</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Stale PRs</span><span>{stalePRs}</span>
            </div>
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Avg velocity</span><span>{avgVelocity} pt/day</span>
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  )
}
