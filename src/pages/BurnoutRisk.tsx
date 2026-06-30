// src/pages/BurnoutRisk.tsx
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, X, MessageSquare, Cpu } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { useUser } from '../context/UserContext'
import { Developer, getTeamById, getDeveloperAiProfile, DeveloperAiProfile } from '../data/mockData'
import { AiInsightCard } from '../components/ui/AiInsightCard'
import { computeBurnoutInsight, computeDeveloperInsight } from '../lib/insights'
import { RiskBadge } from '../components/ui/RiskBadge'
import { ActivityHeatmap } from '../components/ui/ActivityHeatmap'
import { PageSkeleton } from '../components/ui/PageSkeleton'
import { useSimulatedLoad } from '../hooks/useSimulatedLoad'

type Tab = 'wellbeing' | 'ai-effort'

function TrendIcon({ trend }: { trend: Developer['velocityTrend'] }) {
  if (trend === 'up') return <TrendingUp size={14} className="text-success" />
  if (trend === 'down') return <TrendingDown size={14} className="text-danger" />
  return <Minus size={14} className="text-text-secondary" />
}

function AiEffortBadge({ score }: { score: number }) {
  if (score < 8)  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">Efficient</span>
  if (score < 15) return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning">Normal</span>
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-danger/10 text-danger">High Effort</span>
}

function AiTrendIcon({ trend }: { trend: DeveloperAiProfile['efficiencyTrend'] }) {
  if (trend === 'up')   return <TrendingUp size={14} className="text-success" />
  if (trend === 'down') return <TrendingDown size={14} className="text-danger" />
  return <Minus size={14} className="text-text-secondary" />
}

export function BurnoutRisk() {
  const { visibleDevelopers, activeUser } = useUser()
  const isLoading = useSimulatedLoad()
  const [selected, setSelected]         = useState<Developer | null>(null)
  const [selectedAiDev, setSelectedAiDev] = useState<Developer | null>(null)
  const [tab, setTab]                   = useState<Tab>('wellbeing')

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

  if (isLoading) return <PageSkeleton />

  return (
    <div className="relative">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Team Wellbeing Radar</h1>
        <p className="text-text-secondary text-sm mt-1">Early signals, before they become problems</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 mb-6 bg-bg border border-border rounded-lg p-1 w-fit">
        {([['wellbeing', 'Wellbeing'], ['ai-effort', 'AI Effort']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            data-testid={`tab-${key}`}
            onClick={() => {
              setTab(key)
              if (key === 'wellbeing') setSelectedAiDev(null)
              if (key === 'ai-effort') setSelected(null)
            }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              tab === key
                ? 'bg-card text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Wellbeing tab ──────────────────────────────────────────── */}
      {tab === 'wellbeing' && (
        <>
          <AiInsightCard text={burnoutInsightText} />

          <div className="flex gap-3 mb-6 flex-wrap">
            {(['healthy', 'watch', 'at-risk', 'critical'] as const).map(level => {
              const count = visibleDevelopers.filter(d => d.riskLevel === level).length
              return (
                <div key={level} className="bg-card border border-border rounded-lg px-4 py-2 flex items-center gap-2">
                  <RiskBadge level={level} />
                  <span className="text-text-primary font-semibold">{count}</span>
                </div>
              )
            })}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
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
                  {/* Mobile */}
                  <div className="md:hidden px-4 py-3.5 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent text-xs font-semibold">{dev.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-text-primary text-sm font-medium truncate">{dev.name}</span>
                        <RiskBadge level={dev.riskLevel} developerName={dev.name} />
                      </div>
                      <p className="text-text-secondary text-xs truncate">{dev.riskSignal}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <TrendIcon trend={dev.velocityTrend} />
                      <span className="text-text-secondary text-xs">{dev.lastActive}</span>
                    </div>
                  </div>
                  {/* Desktop */}
                  <div className="hidden md:grid grid-cols-[1fr_1fr_120px_2fr_100px_80px] gap-4 px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent text-xs font-semibold">{dev.initials}</span>
                      </div>
                      <span className="text-text-primary text-sm font-medium truncate">{dev.name}</span>
                    </div>
                    <span className="text-text-secondary text-sm self-center truncate">
                      {dev.teamId.replace('team-', '').replace('-', ' ')}
                    </span>
                    <span className="self-center"><RiskBadge level={dev.riskLevel} developerName={dev.name} /></span>
                    <span className="text-text-secondary text-xs self-center leading-relaxed">{dev.riskSignal}</span>
                    <span className="text-text-secondary text-xs self-center">{dev.lastActive}</span>
                    <span className="self-center"><TrendIcon trend={dev.velocityTrend} /></span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {/* ── AI Effort tab ──────────────────────────────────────────── */}
      {tab === 'ai-effort' && (
        <>
          <AiInsightCard text="Payment module requires 3x AI effort vs team average — dev-3 consuming 24 credits/pt. Consider adding sprint points or pairing with a senior engineer." />

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="hidden md:grid grid-cols-[1fr_110px_110px_80px_100px] gap-4 px-5 py-3 border-b border-border text-text-secondary text-xs font-medium uppercase tracking-wider">
              <span>Developer</span>
              <span>Daily Avg (credits)</span>
              <span
                title="AI Credits Used ÷ Story Points. Higher = more AI effort per unit of work."
                className="cursor-help underline decoration-dotted"
              >
                Effort Score
              </span>
              <span>Trend</span>
              <span>Status</span>
            </div>
            <div>
              {visibleDevelopers.map((dev, i) => {
                const profile = getDeveloperAiProfile(dev.id)
                if (!profile) return null
                const avgCredits = Math.round(
                  profile.aiCreditsPerDay.reduce((a, b) => a + b, 0) / profile.aiCreditsPerDay.length,
                )
                return (
                  <motion.div
                    key={dev.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => setSelectedAiDev(dev)}
                    className="border-b border-border last:border-0 cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    {/* Mobile */}
                    <div className="md:hidden px-4 py-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent text-xs font-semibold">{dev.initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-text-primary text-sm font-medium">{dev.name}</span>
                        <p className="text-text-secondary text-xs">
                          {avgCredits} credits/day · {profile.aiEffortScore} pts/credit
                        </p>
                      </div>
                      <AiEffortBadge score={profile.aiEffortScore} />
                    </div>
                    {/* Desktop */}
                    <div className="hidden md:grid grid-cols-[1fr_110px_110px_80px_100px] gap-4 px-5 py-3.5 items-center">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
                          <span className="text-accent text-xs font-semibold">{dev.initials}</span>
                        </div>
                        <span className="text-text-primary text-sm font-medium truncate">{dev.name}</span>
                      </div>
                      <span className="text-text-primary text-sm font-medium">{avgCredits}</span>
                      <span
                        data-testid={`ai-effort-score-${dev.name.toLowerCase().replace(/\s+/g, '-')}`}
                        className="text-text-primary text-sm font-medium"
                      >{profile.aiEffortScore}</span>
                      <span><AiTrendIcon trend={profile.efficiencyTrend} /></span>
                      <span><AiEffortBadge score={profile.aiEffortScore} /></span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </>
      )}

      {/* ── Wellbeing side panel ──────────────────────────────────── */}
      <AnimatePresence>
        {selected && tab === 'wellbeing' && (
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

      {/* ── AI Effort side panel ──────────────────────────────────── */}
      <AnimatePresence>
        {selectedAiDev && tab === 'ai-effort' && (() => {
          const profile = getDeveloperAiProfile(selectedAiDev.id)
          if (!profile) return null
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
          const chartData = days.map((day, i) => ({ day, credits: profile.aiCreditsPerDay[i] }))
          const firstName = selectedAiDev.name.split(' ')[0]
          const scoreLabel = profile.aiEffortScore < 8 ? 'very efficient' : profile.aiEffortScore < 15 ? 'within normal range' : '3x above team average, indicating high task complexity'
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedAiDev(null)}
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
                        <span className="text-accent font-bold">{selectedAiDev.initials}</span>
                      </div>
                      <div>
                        <p className="text-text-primary font-semibold">{selectedAiDev.name}</p>
                        <p className="text-text-secondary text-xs">{selectedAiDev.role}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedAiDev(null)} className="text-text-secondary hover:text-text-primary transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <AiInsightCard text={`${firstName} uses ${profile.aiEffortScore} AI credits per story point — ${scoreLabel}.`} />

                  {/* Daily credits bar chart */}
                  <div className="mb-6">
                    <p className="text-text-secondary text-xs font-medium mb-3 uppercase tracking-wider">
                      AI Credits — Last 7 Days
                    </p>
                    <div className="h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                          <XAxis
                            dataKey="day"
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fill: '#64748b', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <Tooltip
                            contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }}
                            itemStyle={{ color: '#6366f1' }}
                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                          />
                          <Bar dataKey="credits" fill="#6366f1" radius={[3, 3, 0, 0]} name="Credits" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Top AI modules */}
                  <div>
                    <p className="text-text-secondary text-xs font-medium mb-3 uppercase tracking-wider">
                      Top AI Modules
                    </p>
                    <div className="space-y-2">
                      {profile.topAiModules.map((mod, i) => (
                        <div key={mod} className="flex items-center gap-2 bg-bg rounded-lg px-3 py-2.5">
                          <Cpu size={12} className="text-accent flex-shrink-0" />
                          <span className="text-text-primary text-sm">{mod}</span>
                          <span className="ml-auto text-text-secondary text-xs">#{i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
