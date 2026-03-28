// src/pages/SprintPrediction.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import { AiInsightCard } from '../components/ui/AiInsightCard'
import { sprint } from '../data/mockData'
import { useUser } from '../context/UserContext'

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs">
      <p className="text-text-secondary mb-1">Day {label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value} pts</p>
      ))}
    </div>
  )
}

export function SprintPrediction() {
  const { visibleDevelopers } = useUser()
  const [deepDiveOpen, setDeepDiveOpen] = useState(false)

  const completionPct = Math.round((sprint.projectedPoints / sprint.totalPoints) * 100)

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">Sprint Prediction</h1>
          <span className="flex-shrink-0 bg-success/10 text-success border border-success/20 text-xs font-semibold px-2.5 py-1 rounded-full">
            {completionPct}% predicted
          </span>
        </div>
        <p className="text-text-secondary text-sm mt-1 leading-relaxed">
          {sprint.name} · {sprint.totalPoints} pts
        </p>
      </div>

      {/* Burndown chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-card border border-border rounded-xl p-6 mb-6"
      >
        <h2 className="text-text-primary font-semibold mb-4">Burndown Chart</h2>
        <div className="h-[200px] md:h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sprint.burndownData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" />
            <XAxis dataKey="day" stroke="#64748b" tick={{ fontSize: 12 }} label={{ value: 'Sprint Day', position: 'insideBottom', offset: -2, fill: '#64748b', fontSize: 12 }} />
            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} label={{ value: 'Points Remaining', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#64748b' }} />
            <Line type="monotone" dataKey="ideal" name="Ideal" stroke="#64748b" strokeDasharray="6 3" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="actual" name="Actual" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} connectNulls={false} />
            <Line type="monotone" dataKey="predicted" name="AI Predicted" stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={2} dot={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
        </div>
      </motion.div>

      {/* AI Insight banner */}
      <AiInsightCard text={`At current velocity, the team will complete ${completionPct}% of Sprint commitments by end of day ${sprint.endDate}. Confidence: 84%`} />

      {/* Deep Dive toggle */}
      <motion.button
        onClick={() => setDeepDiveOpen(v => !v)}
        className="flex items-center gap-2 text-sm text-accent hover:text-accent/80 font-medium mb-4 transition-colors"
        whileHover={{ x: 2 }}
      >
        <ChevronDown size={16} className={`transition-transform ${deepDiveOpen ? 'rotate-180' : ''}`} />
        {deepDiveOpen ? 'Hide' : 'Show'} Deep Dive Analysis
      </motion.button>

      <AnimatePresence>
        {deepDiveOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Top blockers */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle size={15} className="text-warning" /> Top Blockers
                </h3>
                <div className="space-y-3">
                  {sprint.topBlockers.map((b, i) => (
                    <div key={b.id} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-warning/15 text-warning text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <div>
                        <p className="text-text-primary text-sm">{b.description}</p>
                        <p className="text-danger text-xs mt-0.5">{b.tasksDelayed} {b.tasksDelayed === 1 ? 'task' : 'tasks'} delayed</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-dev velocity */}
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-text-primary font-semibold mb-4">Developer Velocity</h3>
                <div className="space-y-2.5">
                  {visibleDevelopers.slice(0, 8).map(dev => (
                    <div key={dev.id} className="flex items-center gap-3">
                      <span className="text-text-secondary text-xs w-20 truncate flex-shrink-0">{dev.name.split(' ')[0]}</span>
                      <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-accent rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min((dev.velocity / 8) * 100, 100)}%` }}
                          transition={{ duration: 0.8, delay: 0.1 }}
                        />
                      </div>
                      <span className="text-text-secondary text-xs w-12 text-right flex-shrink-0">{dev.velocity} pt/d</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Slip-risk tasks */}
            <div className="bg-card border border-border rounded-xl p-5 mt-4">
              <h3 className="text-text-primary font-semibold mb-4">Tasks Most Likely to Slip</h3>
              <div className="space-y-2">
                {visibleDevelopers
                  .flatMap(d => d.tasks.filter(t => t.status === 'blocked' || (t.status === 'in-progress' && t.points >= 8)))
                  .slice(0, 5)
                  .map(task => (
                    <div key={task.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${task.status === 'blocked' ? 'bg-danger/15 text-danger' : 'bg-warning/15 text-warning'}`}>
                        {task.status === 'blocked' ? 'Blocked' : 'High Risk'}
                      </span>
                      <span className="text-text-primary text-sm flex-1">{task.title}</span>
                      <span className="text-text-secondary text-xs">{task.points}pt</span>
                    </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
