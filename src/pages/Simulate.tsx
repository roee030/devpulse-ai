// src/pages/Simulate.tsx
// Internal simulation dashboard — not linked in sidebar.
// Route: /simulate
import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// ── Types ──────────────────────────────────────────────────────────────────────

type EventSeverity = 'info' | 'warning' | 'danger' | 'success'

interface SimEvent {
  day: number
  severity: EventSeverity
  icon: string
  text: string
  detection?: Detection
}

interface Detection {
  id: string
  type: 'burnout' | 'stale-pr' | 'sprint-risk' | 'struggling'
  severity: 'critical' | 'warning'
  title: string
  signals: string[]
  triggeredDay: number
}

// ── Scenario definition ───────────────────────────────────────────────────────

const SCENARIO: SimEvent[] = [
  // Day 1
  { day: 1, severity: 'info',    icon: '🚀', text: 'Sprint 24 created — "Auth Refactor & Payment" — 84 points, 12 tasks' },
  { day: 1, severity: 'info',    icon: '👥', text: '6 developers assigned: Lior, Maya, Avi, Noa, Tom, Dana' },
  { day: 1, severity: 'info',    icon: '📋', text: 'DP-1 Auth Refactor (8pts) → noa.levi  |  DP-2 Payment Fix (13pts) → tom.levi' },
  { day: 1, severity: 'info',    icon: '📋', text: 'DP-3 UI Library (5pts) → dana.mizrahi  |  DP-7 Security (8pts) → avi.shapiro' },
  // Day 2
  { day: 2, severity: 'info',    icon: '💻', text: 'noa.levi: commit 10:24 — "feat: JWT refresh token logic [DP-1]"' },
  { day: 2, severity: 'info',    icon: '💻', text: 'tom.levi: commit 11:05 — "feat: payment module initial work"' },
  { day: 2, severity: 'info',    icon: '💻', text: 'dana.mizrahi: commit 10:40 — "feat: working on UI components [DP-3]"' },
  // Day 3
  { day: 3, severity: 'info',    icon: '🔀', text: 'noa.levi: opened PR #247 — "feat: auth service refactor" (reviewer: avi.shapiro)' },
  { day: 3, severity: 'info',    icon: '💻', text: 'tom.levi: commit 10:30 — "feat: payment module initial work"' },
  { day: 3, severity: 'info',    icon: '🤖', text: 'dana.mizrahi: 1200 AI credits used on UI Components today' },
  // Day 4
  { day: 4, severity: 'info',    icon: '💻', text: 'noa.levi: commit 14:15 — "feat: session store optimization [DP-4]"' },
  { day: 4, severity: 'info',    icon: '📦', text: 'dana.mizrahi: DP-3 moved to "In Review"' },
  { day: 4, severity: 'info',    icon: '💻', text: 'tom.levi: commit 15:10 — "feat: payment module attempt 4"' },
  // Day 5
  { day: 5, severity: 'warning', icon: '⚠️', text: 'tom.levi: commit 22:48 — "fix: payment module attempt 5 - still broken"' },
  { day: 5, severity: 'warning', icon: '⚠️', text: 'tom.levi: commit 23:30 — "debug: adding logs to payment service"' },
  { day: 5, severity: 'warning', icon: '🔴', text: 'dana.mizrahi: DP-3 reopened — "Accessibility issues found in review"' },
  { day: 5, severity: 'info',    icon: '💬', text: 'Slack #backend-team — tom.levi: "יש לי בעיה עם ה-payment module..."' },
  { day: 5, severity: 'info',    icon: '💬', text: 'Slack #backend-team — avi.shapiro: "@tom תפתח PR ונסתכל ביחד"' },
  // Day 6
  { day: 6, severity: 'warning', icon: '⚠️', text: 'tom.levi: commit 22:10 — "fix: payment module attempt 6 - still broken"' },
  { day: 6, severity: 'warning', icon: '⚠️', text: 'tom.levi: PR #249 opened — "fix: payment module - first attempt"' },
  {
    day: 6, severity: 'warning', icon: '🟡',
    text: 'Stale PR detected: PR #247 (noa.levi) — 4 days with no review',
    detection: {
      id: 'stale-pr-1',
      type: 'stale-pr',
      severity: 'warning',
      title: 'Stale PR: noa.levi #247',
      signals: ['PR open 4 days without review', 'Reviewer avi.shapiro assigned but unresponsive', 'Auth refactor blocked'],
      triggeredDay: 6,
    },
  },
  // Day 7
  { day: 7, severity: 'warning', icon: '⚠️', text: 'tom.levi: commit 23:15 — "debug: adding logs to payment service"' },
  { day: 7, severity: 'warning', icon: '⚠️', text: 'tom.levi: commit 00:44 — "chore: trying different approach"' },
  {
    day: 7, severity: 'danger',  icon: '🔴',
    text: 'BURNOUT SIGNAL: tom.levi — 3 consecutive late-night sessions, 0 Jira progress since day 4',
    detection: {
      id: 'burnout-tom',
      type: 'burnout',
      severity: 'critical',
      title: 'Burnout: tom.levi',
      signals: ['3 consecutive late-night commits (22:00–01:00)', 'DP-2 Payment — 0% progress in 3 days', 'PR #249 still unreviewed'],
      triggeredDay: 7,
    },
  },
  // Day 8
  { day: 8, severity: 'info',    icon: '✅', text: 'avi.shapiro: PR #247 approved — auth service merged (5 days late)' },
  { day: 8, severity: 'danger',  icon: '❌', text: 'tom.levi: PR #249 rejected — "Logic is incorrect, needs rethink"' },
  {
    day: 8, severity: 'warning', icon: '🟡',
    text: 'Sprint risk: 42/84pts complete at day 8 — predicted 61% completion by end',
    detection: {
      id: 'sprint-risk-1',
      type: 'sprint-risk',
      severity: 'warning',
      title: 'Sprint Risk: 61% predicted',
      signals: ['42/84 pts complete (50%) at day 8 of 14', 'tom.levi 0pts on 31pts of assigned work', 'dana.mizrahi DP-3 reopened twice'],
      triggeredDay: 8,
    },
  },
  { day: 8, severity: 'warning', icon: '🤖', text: 'dana.mizrahi: DP-3 moved to "In Review" (second attempt)' },
  { day: 8, severity: 'warning', icon: '🤖', text: 'dana.mizrahi: 1500 AI credits used on UI Components today (3x avg)' },
  // Day 9
  { day: 9, severity: 'danger',  icon: '⚠️', text: 'tom.levi: commit 23:50 — "fix: payment module attempt 9"' },
  { day: 9, severity: 'danger',  icon: '⚠️', text: 'tom.levi: commit 01:20 — "chore: trying completely different approach"' },
  { day: 9, severity: 'warning', icon: '🔴', text: 'dana.mizrahi: DP-3 reopened again — "Performance regression detected"' },
  {
    day: 9, severity: 'warning', icon: '🟡',
    text: 'Struggling signal: dana.mizrahi — DP-3 reopened 2x, high AI usage pattern',
    detection: {
      id: 'struggling-dana',
      type: 'struggling',
      severity: 'warning',
      title: 'Struggling: dana.mizrahi',
      signals: ['DP-3 reopened 2 times in 5 days', 'AI usage 3x team average (1200+ credits/day)', 'Accessibility + performance issues recurring'],
      triggeredDay: 9,
    },
  },
  { day: 9, severity: 'info',    icon: '💬', text: 'Slack #backend-team — tom.levi: "עדיין תקוע, ניסיתי הכל. אפשר לעשות פגישה?"' },
  { day: 9, severity: 'info',    icon: '💬', text: 'Slack #engineering-leads — maya.cohen: "נראה שיש בעיה עם ה-payment, צריך לשים עין"' },
  // Day 10
  { day: 10, severity: 'danger', icon: '⚠️', text: 'tom.levi: PR #251 opened — "fix: payment module - second attempt"' },
  { day: 10, severity: 'danger', icon: '⚠️', text: 'tom.levi: commit 22:35 — "fix: payment module attempt 10"' },
  // Day 11
  { day: 11, severity: 'warning',icon: '📦', text: 'dana.mizrahi: DP-3 moved to "In Review" (third attempt)' },
  { day: 11, severity: 'danger', icon: '⚠️', text: 'tom.levi: commit 23:10 — "debug: race condition investigation"' },
  { day: 11, severity: 'danger', icon: '⚠️', text: 'tom.levi: commit 01:55 — "chore: reverting payment changes"' },
  // Day 12
  { day: 12, severity: 'danger', icon: '❌', text: 'tom.levi: PR #251 rejected — "Still has the same race condition"' },
  { day: 12, severity: 'info',   icon: '💬', text: 'Slack #frontend-team — dana.mizrahi: "ה-DP-3 חוזר לי שוב, performance regression"' },
  // Day 13
  { day: 13, severity: 'danger', icon: '⚠️', text: 'tom.levi: commit 22:50 — "fix: payment module attempt 13"' },
  { day: 13, severity: 'danger', icon: '⚠️', text: 'tom.levi: commit 00:15 — "debug: still investigating race condition"' },
  // Day 14
  { day: 14, severity: 'info',   icon: '📊', text: 'Sprint ended — Final score: 51/84 pts (61%) — below 70% prediction threshold' },
  { day: 14, severity: 'danger', icon: '🔴', text: 'tom.levi: DP-2 Payment (13pts) + DP-6 Mobile Auth (13pts) = 26pts unfinished' },
  { day: 14, severity: 'warning',icon: '🟡', text: 'dana.mizrahi: DP-3 partially done, DP-5 + DP-9 unstarted' },
  { day: 14, severity: 'success',icon: '✅', text: 'noa.levi + avi.shapiro: all assigned tasks delivered on time' },
]

const SPEED_OPTIONS: { label: string; msPerDay: number }[] = [
  { label: '1×',   msPerDay: 1000 },
  { label: '5×',   msPerDay: 200 },
  { label: '10×',  msPerDay: 100 },
  { label: 'Max',  msPerDay: 0 },
]

// ── Severity colours ──────────────────────────────────────────────────────────

function severityClass(s: EventSeverity) {
  if (s === 'danger')  return 'text-red-400'
  if (s === 'warning') return 'text-amber-400'
  if (s === 'success') return 'text-emerald-400'
  return 'text-slate-400'
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Simulate() {
  const [currentDay, setCurrentDay]     = useState(0)
  const [visibleEvents, setVisible]     = useState<SimEvent[]>([])
  const [detections, setDetections]     = useState<Detection[]>([])
  const [running, setRunning]           = useState(false)
  const [speedIdx, setSpeedIdx]         = useState(1)
  const logEndRef                       = useRef<HTMLDivElement>(null)
  const intervalRef                     = useRef<ReturnType<typeof setInterval> | null>(null)

  const speed = SPEED_OPTIONS[speedIdx]
  const maxDay = 14
  const progress = Math.round((currentDay / maxDay) * 100)

  const advanceDay = useCallback(() => {
    setCurrentDay(prev => {
      const next = prev + 1
      if (next > maxDay) {
        setRunning(false)
        return prev
      }
      const dayEvents = SCENARIO.filter(e => e.day === next)
      setVisible(v => [...v, ...dayEvents])
      const newDetections = dayEvents.filter(e => e.detection).map(e => e.detection!)
      if (newDetections.length > 0) setDetections(d => [...d, ...newDetections])
      return next
    })
  }, [])

  // Run at max speed synchronously
  const runMax = useCallback(() => {
    let day = currentDay
    const batch: SimEvent[] = []
    const dets: Detection[] = []
    while (day < maxDay) {
      day++
      const dayEvents = SCENARIO.filter(e => e.day === day)
      batch.push(...dayEvents)
      dets.push(...dayEvents.filter(e => e.detection).map(e => e.detection!))
    }
    setCurrentDay(maxDay)
    setVisible(v => [...v, ...batch])
    setDetections(d => [...d, ...dets])
    setRunning(false)
  }, [currentDay])

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    if (speed.msPerDay === 0) {
      runMax()
      return
    }
    intervalRef.current = setInterval(advanceDay, speed.msPerDay)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, speed.msPerDay, advanceDay, runMax])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [visibleEvents])

  function handleReset() {
    setRunning(false)
    setCurrentDay(0)
    setVisible([])
    setDetections([])
  }

  const detectionColors: Record<Detection['type'], string> = {
    burnout:      'border-red-500/40 bg-red-500/5',
    'stale-pr':   'border-amber-500/40 bg-amber-500/5',
    'sprint-risk': 'border-amber-500/40 bg-amber-500/5',
    struggling:   'border-amber-500/40 bg-amber-500/5',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap size={18} className="text-indigo-400" />
          <h1 className="text-xl font-bold text-slate-100">DevPulse Simulation Engine</h1>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 ml-1">
            INTERNAL ONLY
          </span>
        </div>
        <p className="text-sm text-slate-500">Replays 14 days of company activity — Jira + GitHub + Slack — to verify signal detection</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {!running && currentDay < maxDay ? (
          <button
            onClick={() => setRunning(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <Play size={14} /> {currentDay === 0 ? 'Run Full Simulation' : 'Continue'}
          </button>
        ) : running ? (
          <button
            onClick={() => setRunning(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
          >
            <Pause size={14} /> Pause
          </button>
        ) : null}

        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-medium transition-colors"
        >
          <RotateCcw size={14} /> Reset to Day 0
        </button>

        <div className="flex gap-1 ml-auto">
          {SPEED_OPTIONS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setSpeedIdx(i)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors ${
                speedIdx === i
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400 font-medium">
            {currentDay === 0 ? 'Ready to start' : currentDay < maxDay ? `Day ${currentDay} / ${maxDay}` : 'Simulation complete'}
          </span>
          <span className="text-xs text-slate-500">{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">

        {/* LEFT: Activity log */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Activity Log</p>
          </div>
          <div className="h-[520px] overflow-y-auto p-3 space-y-1 font-mono text-[12px]">
            {visibleEvents.length === 0 && (
              <p className="text-slate-600 p-2">Press ▶ Run to start the simulation…</p>
            )}
            <AnimatePresence initial={false}>
              {visibleEvents.map((e, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-start gap-2 py-0.5"
                >
                  <span className="text-slate-600 shrink-0 w-12">D{e.day.toString().padStart(2, '0')}</span>
                  <span className="shrink-0">{e.icon}</span>
                  <span className={severityClass(e.severity)}>{e.text}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={logEndRef} />
          </div>
        </div>

        {/* RIGHT: Detections */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              DevPulse Detections
              {detections.length > 0 && (
                <span className="ml-2 text-indigo-400">{detections.length}</span>
              )}
            </p>
          </div>
          <div className="h-[520px] overflow-y-auto p-3 space-y-3">
            {detections.length === 0 && (
              <p className="text-slate-600 text-xs font-mono p-2">No signals yet…</p>
            )}
            <AnimatePresence>
              {detections.map(d => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`rounded-lg border p-3 ${detectionColors[d.type]}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold uppercase tracking-wider ${
                      d.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {d.severity === 'critical' ? '🔴' : '🟡'} {d.type.replace('-', ' ')}
                    </span>
                    <span className="ml-auto text-[10px] text-slate-500">Day {d.triggeredDay}</span>
                  </div>
                  <p className="text-slate-200 text-sm font-medium mb-2">{d.title}</p>
                  <ul className="space-y-0.5">
                    {d.signals.map((s, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-1">
                        <span className="mt-0.5 shrink-0">·</span>{s}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
