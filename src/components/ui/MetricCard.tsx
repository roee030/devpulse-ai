// src/components/ui/MetricCard.tsx
import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCountUp } from '../../hooks/useCountUp'

interface Props {
  label: string
  value: number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  trendLabel?: string
  icon?: ReactNode
  color?: 'default' | 'danger' | 'warning' | 'success'
  delay?: number
}

const colorMap = {
  default: 'text-accent',
  danger: 'text-danger',
  warning: 'text-warning',
  success: 'text-success',
}

export function MetricCard({ label, value, unit, trend, trendLabel, icon, color = 'default', delay = 0 }: Props) {
  const animated = useCountUp(value)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.02, transition: { duration: 0.15 } }}
      className="bg-card border border-border rounded-xl p-5 cursor-default card-glow"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-text-secondary text-sm font-medium">{label}</p>
        {icon && <span className="text-text-secondary">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold ${colorMap[color]}`}>
          {animated}{unit}
        </span>
      </div>
      {(trend || trendLabel) && (
        <div className="flex items-center gap-1 mt-2">
          {trend === 'up' && <TrendingUp size={13} className="text-success" />}
          {trend === 'down' && <TrendingDown size={13} className="text-danger" />}
          {trend === 'stable' && <Minus size={13} className="text-text-secondary" />}
          {trendLabel && <span className="text-text-secondary text-xs">{trendLabel}</span>}
        </div>
      )}
    </motion.div>
  )
}
