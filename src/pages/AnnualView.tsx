// src/pages/AnnualView.tsx
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calendar, CheckCircle, Clock, TrendingUp, Target } from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import type { QuarterSummary } from '../data/mockData'
import { useUnifiedData } from '../context/UnifiedDataContext'
import { AiInsightCard } from '../components/ui/AiInsightCard'

const QUARTER_CONFIG = {
  completed: {
    Icon: CheckCircle,
    statusBg: 'bg-success/10',
    statusText: 'text-success',
    barColor: 'bg-success',
    cardBorder: 'border-border',
    label: 'Completed',
  },
  current: {
    Icon: Clock,
    statusBg: 'bg-accent/10',
    statusText: 'text-accent',
    barColor: 'bg-accent',
    cardBorder: 'border-accent/30',
    label: 'In Progress',
  },
  upcoming: {
    Icon: Calendar,
    statusBg: 'bg-white/5',
    statusText: 'text-text-secondary',
    barColor: 'bg-border',
    cardBorder: 'border-border',
    label: 'Upcoming',
  },
} as const

const INITIATIVE_DOT: Record<string, string> = {
  done: 'bg-success',
  'on-track': 'bg-accent',
  'at-risk': 'bg-warning',
  upcoming: 'bg-border',
}

const INITIATIVE_TEXT: Record<string, string> = {
  done: 'text-success',
  'on-track': 'text-accent',
  'at-risk': 'text-warning',
  upcoming: 'text-text-secondary',
}

function QuarterCard({ quarter, delay }: { quarter: QuarterSummary; delay: number }) {
  const cfg = QUARTER_CONFIG[quarter.status]
  const { Icon } = cfg
  const progressPct = quarter.deliveredPoints > 0
    ? Math.round((quarter.deliveredPoints / quarter.totalPoints) * 100)
    : null
  const healthColor = quarter.healthScore >= 75 ? 'text-success'
    : quarter.healthScore >= 60 ? 'text-warning' : 'text-danger'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={`bg-card border ${cfg.cardBorder} rounded-xl p-5 flex flex-col gap-4 ${
        quarter.status === 'current' ? 'shadow-lg shadow-accent/5' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.statusBg} ${cfg.statusText} mb-2`}>
            <Icon size={11} />
            {cfg.label}
          </div>
          <h3 className="text-text-primary font-bold text-lg leading-tight">{quarter.label}</h3>
          <p className="text-text-secondary text-xs mt-0.5">{quarter.dates}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-2xl font-bold ${healthColor}`}>
            {quarter.status === 'upcoming' ? '—' : quarter.healthScore}
          </p>
          <p className="text-text-secondary text-xs">Health</p>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between mb-1.5 text-xs">
          <span className="text-text-secondary">
            {quarter.status === 'upcoming' ? 'Planned points' : 'Points delivered'}
          </span>
          <span className="text-text-primary font-medium">
            {quarter.deliveredPoints > 0 ? `${quarter.deliveredPoints}/` : ''}
            {quarter.totalPoints} pts
            {progressPct !== null ? ` (${progressPct}%)` : ''}
          </span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          {progressPct !== null && (
            <motion.div
              className={`h-full rounded-full ${cfg.barColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.9, delay: delay + 0.15, ease: 'easeOut' }}
            />
          )}
        </div>
      </div>

      {/* Initiatives */}
      <div className="space-y-2 flex-1">
        {quarter.initiatives.map(init => (
          <div key={init.name} className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${INITIATIVE_DOT[init.status]}`} />
            <span className="text-text-secondary text-xs flex-1 leading-snug">{init.name}</span>
            <span className={`text-[10px] font-medium flex-shrink-0 ${INITIATIVE_TEXT[init.status]}`}>
              {init.status.replace('-', ' ')}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export function AnnualView() {
  const { quarterSummaries, monthlyVelocity } = useUnifiedData()
  const insightText = useMemo(() => {
    const q1 = quarterSummaries[0]
    const q2 = quarterSummaries[1]
    const pct1 = Math.round((q1.deliveredPoints / q1.totalPoints) * 100)
    const pct2 = Math.round((q2.deliveredPoints / q2.totalPoints) * 100)
    const avg = Math.round((pct1 + pct2) / 2)
    return `Q1 delivered at ${pct1}% capacity. Q2 is at ${pct2}% with 2 at-risk epics. At current trajectory the team delivers ~${avg}% of annual commitments — unblocking Payment Gateway now protects Q3 enterprise goals.`
  }, [])

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h1 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
          <Calendar size={20} className="text-accent" />
          Annual View — 2026
        </h1>
        <p className="text-text-secondary text-sm mt-1">
          Quarter-by-quarter progress · AI year-end prediction
        </p>
      </motion.div>

      <AiInsightCard text={insightText} />

      {/* Quarter cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {quarterSummaries.map((q, i) => (
          <QuarterCard key={q.id} quarter={q} delay={0.08 + i * 0.07} />
        ))}
      </div>

      {/* Monthly velocity chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.35 }}
        className="bg-card border border-border rounded-xl p-5 mb-4"
      >
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <TrendingUp size={16} className="text-accent" />
          <h2 className="text-text-primary font-semibold">Monthly Velocity</h2>
          <div className="ml-auto flex items-center gap-4 text-xs text-text-secondary">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-accent/80" />
              <span>Actual</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 border-t-2 border-dashed border-warning" />
              <span>Target</span>
            </div>
          </div>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={monthlyVelocity} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#f1f5f9' }}
                itemStyle={{ color: '#64748b' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="actual" fill="#6366f1" radius={[3, 3, 0, 0]} opacity={0.85} name="Actual" />
              <Line
                dataKey="target"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
                name="Target"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Year-end prediction */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.45 }}
        className="bg-card border border-border rounded-xl p-5"
      >
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Target size={16} className="text-warning" />
          <h2 className="text-text-primary font-semibold">Year-End Prediction</h2>
          <span className="ml-auto text-xs font-medium bg-warning/10 text-warning px-2.5 py-0.5 rounded-full">
            AI Forecast
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Planned',      value: '860',  sub: 'Full year target' },
            { label: 'On Track',     value: '~715', sub: '83% completion'   },
            { label: 'At Risk',      value: '~145', sub: 'Needs intervention' },
          ].map(stat => (
            <div key={stat.label} className="bg-bg rounded-lg p-3">
              <p className="text-text-secondary text-[10px] font-medium uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-text-primary font-bold text-xl">{stat.value}</p>
              <p className="text-text-secondary text-[10px] mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
        <p className="text-text-secondary text-xs leading-relaxed">
          Based on Q1–Q2 performance and current velocity trends. Unblocking Payment Gateway and
          Mobile Auth in the next 2 sprints recovers ~80 points and protects the Q3 Enterprise Tier launch.
        </p>
      </motion.div>
    </div>
  )
}
