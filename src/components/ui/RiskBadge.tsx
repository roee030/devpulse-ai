// src/components/ui/RiskBadge.tsx
import { RiskLevel } from '../../data/mockData'

const config: Record<RiskLevel, { label: string; dot: string; text: string }> = {
  healthy:  { label: 'Healthy',  dot: 'bg-success',  text: 'text-success' },
  watch:    { label: 'Watch',    dot: 'bg-warning',  text: 'text-warning' },
  'at-risk':{ label: 'At Risk',  dot: 'bg-danger',   text: 'text-danger' },
  critical: { label: 'Critical', dot: 'bg-danger',   text: 'text-danger' },
}

export function RiskBadge({ level }: { level: RiskLevel }) {
  const c = config[level]
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${c.dot} ${level === 'critical' ? 'pulse-red' : ''}`} />
      <span className={`text-xs font-medium ${c.text}`}>{c.label}</span>
    </span>
  )
}
