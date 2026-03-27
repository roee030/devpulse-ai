// src/components/ui/HealthRing.tsx
import { motion } from 'framer-motion'

interface Props { score: number; size?: number }

function ringColor(score: number) {
  if (score >= 75) return '#22c55e'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

export function HealthRing({ score, size = 120 }: Props) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = ringColor(score)
  const cx = size / 2

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#1e1e2e" strokeWidth={8} />
        <motion.circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-text-primary font-bold"
          style={{ fontSize: size * 0.22, color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-text-secondary" style={{ fontSize: size * 0.1 }}>/ 100</span>
      </div>
    </div>
  )
}
