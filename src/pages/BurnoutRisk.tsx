// src/pages/BurnoutRisk.tsx
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, X, MessageSquare } from 'lucide-react'
import { useUser } from '../context/UserContext'
import { Developer, getTeamById } from '../data/mockData'
import { AiInsightCard } from '../components/ui/AiInsightCard'
import { computeBurnoutInsight, computeDeveloperInsight } from '../lib/insights'
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

  const teamRefs = useMemo(() => {
    const seen = new Set<string>()
    const result: { id: string; name: string }[] = []
    for (const dev of visibleDevelopers) {
      if (!seen.has(dev.teamId)) {
        seen.add(dev.teamId)
        const team = getTeamById(dev.teamId)
        if (team) result.push({ id: team.id, name: team.name })
      }
    }
    return result
  }, [visibleDevelopers])

  const burnoutInsightText = useMemo(
    () => computeBurnoutInsight(visibleDevelopers, teamRefs),
    [visibleDevelopers, teamRefs],
  )

  return (
    <div className="relative">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Team Wellbeing Radar</h1>
        <p className="text-text-secondary text-sm mt-1">Early signals, before they become problems</p>
      </div>

      <AiInsightCard text={burnoutInsightText} />

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

      {/* Developer list — card on mobile, table on desktop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        {/* Desktop table header */}
        <div className="hidden md:grid grid-cols-[1fr_1fr_120px_2fr_100px_80px] gap-4 px-5 py-3 border-b border-border text-text-secondary text-xs font-medium uppercase tracking-wider">
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
              className={`border-b border-border last:border-0 cursor-pointer hover:bg-white/[0.03] transition-colors ${
                activeUser.role === 'developer' && dev.id === visibleDevelopers[0]?.id ? 'bg-accent/5' : ''
              }`}
            >
              {/* Mobile card layout */}
              <div className="md:hidden px-4 py-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <span className="text-accent text-xs font-semibold">{dev.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-text-primary text-sm font-medium truncate">{dev.name}</span>
                    <RiskBadge level={dev.riskLevel} />
                  </div>
                  <p className="text-text-secondary text-xs truncate">{dev.riskSignal}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <TrendIcon trend={dev.velocityTrend} />
                  <span className="text-text-secondary text-xs">{dev.lastActive}</span>
                </div>
              </div>
              {/* Desktop table row */}
              <div className="hidden md:grid grid-cols-[1fr_1fr_120px_2fr_100px_80px] gap-4 px-5 py-3.5">
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
              </div>
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
              className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-card border-l border-border z-50 overflow-y-auto"
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

                {/* AI Insight */}
                <AiInsightCard text={computeDeveloperInsight(selected)} />

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
                            : "Consider a brief check-in to understand any blockers or concerns. A 15-minute async message may be all that's needed."}
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
