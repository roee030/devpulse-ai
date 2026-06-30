// src/components/integrations/UnifiedPlatformCard.tsx
// Card for a Unified.to-backed integration — shows live task/member counts when connected.
import { useState, useEffect } from 'react'
import { CheckCircle, Circle, ChevronRight, Loader2, Users, ListTodo, ExternalLink } from 'lucide-react'
import type { UnifiedTo } from '@unified-api/typescript-sdk'
import type { Connection } from '@unified-api/typescript-sdk/sdk/models/shared'
import { getTasks, getTeamMembers, getIntegrationAuthUrl } from '../../lib/unified'

interface PlatformInfo {
  name: string
  type: string
  description: string
  logoUrl?: string
  color?: string
}

interface Props {
  platform: PlatformInfo
  connection: Connection | null
  workspaceId?: string
  client?: UnifiedTo
}

interface LiveStats {
  tasks: number
  members: number
}

export function UnifiedPlatformCard({ platform, connection, workspaceId = '', client }: Props) {
  const isConnected = !!connection
  const [stats, setStats] = useState<LiveStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [connecting, setConnecting] = useState(false)

  // Fetch live stats when connected
  useEffect(() => {
    if (!isConnected || !connection?.id || !client) return
    setStatsLoading(true)
    Promise.all([
      getTasks(connection.id, client).catch(() => [] as Awaited<ReturnType<typeof getTasks>>),
      getTeamMembers(connection.id, client).catch(() => [] as Awaited<ReturnType<typeof getTeamMembers>>),
    ]).then(([tasks, members]) => {
      setStats({ tasks: tasks.length, members: members.length })
    }).finally(() => setStatsLoading(false))
  }, [isConnected, connection?.id, client])

  async function handleConnect() {
    if (!workspaceId) {
      // Demo mode — simulate connect
      alert(`In production, this opens OAuth for ${platform.name}.\nSet VITE_UNIFIED_WORKSPACE_ID to enable real OAuth.`)
      return
    }
    setConnecting(true)
    try {
      const url = await getIntegrationAuthUrl(platform.type, workspaceId)
      if (url) window.location.href = url
    } catch {
      setConnecting(false)
    }
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 hover:bg-slate-800 transition-all group">
      {/* Logo */}
      <div
        className="p-2.5 rounded-lg shrink-0"
        style={{ background: platform.color ? `${platform.color}20` : 'rgb(51 65 85 / 0.5)' }}
      >
        {platform.logoUrl ? (
          <img src={platform.logoUrl} alt={platform.name} className="w-5 h-5 object-contain" />
        ) : (
          <div className="w-5 h-5 rounded bg-slate-600 flex items-center justify-center">
            <span className="text-[9px] font-bold text-slate-300">{platform.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{platform.name}</p>
        <p className="text-xs text-slate-500 truncate">{platform.description}</p>
        {isConnected && (
          <div className="flex items-center gap-3 mt-1.5">
            {statsLoading ? (
              <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
            ) : stats ? (
              <>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <ListTodo className="w-3 h-3" /> {stats.tasks} tasks
                </span>
                <span className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Users className="w-3 h-3" /> {stats.members} members
                </span>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Action */}
      {isConnected ? (
        <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
          <CheckCircle className="w-3.5 h-3.5" />
          Connected
        </span>
      ) : (
        <button
          onClick={handleConnect}
          disabled={connecting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white rounded-lg transition-colors shrink-0"
        >
          {connecting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <ExternalLink className="w-3 h-3" />
          )}
          Connect
        </button>
      )}

      {isConnected && (
        <span className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
          <Circle className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
        </span>
      )}
    </div>
  )
}
