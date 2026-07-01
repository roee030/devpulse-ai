// src/pages/Roadmap.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Map, AlertTriangle, ArrowDown, X } from 'lucide-react'
import { epics, Epic, RippleCard as RippleCardType } from '../data/mockData'
import type { EpicStatus } from '../data/mockData'
import { AiInsightCard } from '../components/ui/AiInsightCard'
import { useUnifiedData } from '../context/UnifiedDataContext'
import { computeEpicStatusMap } from '../lib/metrics'

const TOTAL_WEEKS = 52
const CURRENT_WEEK = 26

const STATUS_STYLES = {
  completed:  { bar: 'bg-success/80',  badge: 'bg-success/10 text-success',  label: 'Completed' },
  'on-track': { bar: 'bg-accent/80',   badge: 'bg-accent/10 text-accent',    label: 'On Track'  },
  'at-risk':  { bar: 'bg-warning/80',  badge: 'bg-warning/10 text-warning',  label: 'At Risk'   },
  delayed:    { bar: 'bg-danger/80',   badge: 'bg-danger/10 text-danger',    label: 'Delayed'   },
} as const

const RIPPLE_STYLES = {
  danger:   { border: 'border-danger/40',  bg: 'bg-danger/5',  dot: 'bg-danger',  text: 'text-danger'  },
  warn:     { border: 'border-warning/40', bg: 'bg-warning/5', dot: 'bg-warning', text: 'text-warning' },
  business: { border: 'border-accent/40',  bg: 'bg-accent/5',  dot: 'bg-accent',  text: 'text-accent'  },
} as const

const QUARTERS = [
  { label: 'Q1 · Jan–Mar', start: 1,  end: 13 },
  { label: 'Q2 · Apr–Jun', start: 14, end: 26 },
  { label: 'Q3 · Jul–Sep', start: 27, end: 39 },
  { label: 'Q4 · Oct–Dec', start: 40, end: 52 },
]

function weekPct(week: number) {
  return ((week - 1) / TOTAL_WEEKS) * 100
}

function RippleChainPanel({ chain }: { chain: RippleCardType[] }) {
  return (
    <div>
      {chain.map((card, i) => {
        const s = RIPPLE_STYLES[card.severity]
        return (
          <div key={card.id}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.1 }}
              className={`border rounded-xl p-4 ${s.border} ${s.bg}`}
            >
              <div className="flex items-start gap-2.5">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                <div>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${s.text} opacity-80`}>
                    {card.quarter} · {card.timeframe}
                  </p>
                  <p className="text-text-primary text-sm font-semibold leading-snug">{card.title}</p>
                  <p className="text-text-secondary text-xs mt-1 leading-relaxed">{card.consequence}</p>
                </div>
              </div>
            </motion.div>
            {i < chain.length - 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className="flex justify-center py-2"
              >
                <ArrowDown size={14} className="text-border" />
              </motion.div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function Roadmap() {
  const { enrichedTasks, isLive } = useUnifiedData()
  const [selected, setSelected] = useState<Epic | null>(null)

  // Overlay live epic statuses from real tasks when connected
  const liveStatusMap = isLive ? computeEpicStatusMap(enrichedTasks) : null
  const getEpicStatus = (epic: Epic): EpicStatus =>
    (liveStatusMap?.get(epic.id) as EpicStatus | undefined) ?? epic.status

  const atRiskCount = epics.filter(e => {
    const s = getEpicStatus(e)
    return s === 'at-risk' || s === 'delayed'
  }).length

  return (
    <div className="relative">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
              <Map size={20} className="text-accent" />
              Product Roadmap 2026
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Full-year view · Click an at-risk epic to see downstream impact
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.entries(STATUS_STYLES) as [keyof typeof STATUS_STYLES, typeof STATUS_STYLES[keyof typeof STATUS_STYLES]][]).map(([key, val]) => (
              <span key={key} className={`px-2.5 py-1 rounded-full text-xs font-medium ${val.badge}`}>
                {val.label}
              </span>
            ))}
          </div>
        </div>
      </motion.div>

      <AiInsightCard
        text={atRiskCount > 0
          ? `${atRiskCount} epic${atRiskCount > 1 ? 's are' : ' is'} at risk — Payment Gateway and Mobile Auth delays may cascade into Q3 Enterprise launch.`
          : 'All epics on track for 2026 — no cascading risks detected.'}
      />

      {/* Gantt */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
        className="bg-card border border-border rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            {/* Quarter header */}
            <div className="flex h-9 border-b border-border bg-bg/50">
              <div className="w-48 flex-shrink-0 border-r border-border flex items-center px-4">
                <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Epic</span>
              </div>
              <div className="flex-1 relative">
                {QUARTERS.map(q => (
                  <div
                    key={q.label}
                    className="absolute top-0 bottom-0 border-r border-border/50 flex items-center px-2"
                    style={{
                      left: `${weekPct(q.start)}%`,
                      width: `${((q.end - q.start + 1) / TOTAL_WEEKS) * 100}%`,
                    }}
                  >
                    <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider truncate">
                      {q.label}
                    </span>
                  </div>
                ))}
                {/* Current week marker */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-accent pointer-events-none z-10"
                  style={{ left: `${((CURRENT_WEEK - 0.5) / TOTAL_WEEKS) * 100}%` }}
                />
              </div>
            </div>

            {/* Epic rows */}
            <div className="divide-y divide-border/40">
              {epics.map((epic, i) => {
                const leftPct = weekPct(epic.startWeek)
                const widthPct = ((epic.endWeek - epic.startWeek + 1) / TOTAL_WEEKS) * 100
                const epicStatus = getEpicStatus(epic)
                const styles = STATUS_STYLES[epicStatus as keyof typeof STATUS_STYLES]
                const hasRipple = !!(epic.rippleChain?.length)
                return (
                  <motion.div
                    key={epic.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.04 }}
                    className="flex items-center h-14 hover:bg-white/[0.025] transition-colors"
                  >
                    {/* Label */}
                    <div className="w-48 flex-shrink-0 border-r border-border px-4">
                      <p className="text-text-primary text-xs font-medium truncate">{epic.title}</p>
                      <p className="text-text-secondary text-[10px] truncate">{epic.owner}</p>
                    </div>
                    {/* Bar area */}
                    <div className="flex-1 relative h-full">
                      {/* Quarter dividers */}
                      {[13, 26, 39].map(w => (
                        <div
                          key={w}
                          className="absolute top-0 bottom-0 w-px bg-border/25 pointer-events-none"
                          style={{ left: `${(w / TOTAL_WEEKS) * 100}%` }}
                        />
                      ))}
                      {/* Current week line */}
                      <div
                        className="absolute top-0 bottom-0 w-px bg-accent/25 pointer-events-none"
                        style={{ left: `${((CURRENT_WEEK - 0.5) / TOTAL_WEEKS) * 100}%` }}
                      />
                      {/* Epic bar */}
                      <button
                        onClick={() => hasRipple ? setSelected(epic) : undefined}
                        disabled={!hasRipple}
                        className={`
                          absolute top-1/2 -translate-y-1/2 h-7 rounded-md
                          ${styles.bar}
                          ${hasRipple
                            ? 'cursor-pointer hover:brightness-125 hover:shadow-lg hover:shadow-black/20 transition-all'
                            : 'cursor-default'}
                          flex items-center px-2 gap-1 overflow-hidden
                        `}
                        style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 0.5)}%` }}
                        title={`${epic.title}${hasRipple ? ' — click to see impact' : ''}`}
                      >
                        <span className="text-white text-[10px] font-medium truncate whitespace-nowrap">
                          {epic.title}
                        </span>
                        {hasRipple && (
                          <AlertTriangle size={10} className="text-white/70 flex-shrink-0 ml-auto" />
                        )}
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Ripple Effect Side Panel */}
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
              className="fixed right-0 top-0 h-full w-full sm:w-[440px] bg-card border-l border-border z-50 overflow-y-auto"
            >
              <div className="p-6">
                {/* Panel header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex-1 pr-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider mb-2 ${STATUS_STYLES[getEpicStatus(selected) as keyof typeof STATUS_STYLES].badge}`}>
                      {STATUS_STYLES[getEpicStatus(selected) as keyof typeof STATUS_STYLES].label} · {selected.category}
                    </span>
                    <h2 className="text-text-primary font-bold text-lg leading-tight">{selected.title}</h2>
                    <p className="text-text-secondary text-sm mt-1">{selected.description}</p>
                    <p className="text-text-secondary text-xs mt-1.5">
                      {selected.owner} · Week {selected.startWeek}–{selected.endWeek}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Ripple chain */}
                <div className="border-t border-border pt-5">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle size={14} className="text-warning" />
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      Ripple Effect
                    </span>
                    <span className="ml-auto text-[10px] text-text-secondary italic">
                      If this slips further…
                    </span>
                  </div>
                  {selected.rippleChain && <RippleChainPanel chain={selected.rippleChain} />}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
