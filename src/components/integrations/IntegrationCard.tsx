// src/components/integrations/IntegrationCard.tsx
import { CheckCircle, AlertCircle, Circle, ChevronRight } from 'lucide-react'
import type { IntegrationConfig } from './types'

const statusConfig = {
  connected:     { icon: CheckCircle,  color: 'text-emerald-400', label: 'Connected' },
  error:         { icon: AlertCircle,  color: 'text-red-400',     label: 'Error' },
  not_connected: { icon: Circle,       color: 'text-slate-500',   label: 'Not connected' },
}

interface Props {
  integration: IntegrationConfig
  onConnect: (integration: IntegrationConfig) => void
}

export function IntegrationCard({ integration, onConnect }: Props) {
  const { icon: StatusIcon, color, label } = statusConfig[integration.status]
  const Icon = integration.icon

  return (
    <button
      onClick={() => onConnect(integration)}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800 transition-all text-left group"
    >
      <div className="p-2.5 rounded-lg bg-slate-700/50 shrink-0">
        <Icon className="w-5 h-5 text-slate-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{integration.label}</p>
        <p className="text-xs text-slate-500 truncate">{integration.description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`flex items-center gap-1 text-xs ${color}`}>
          <StatusIcon className="w-3.5 h-3.5" />
          {label}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
    </button>
  )
}
