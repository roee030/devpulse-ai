// src/pages/Settings/IntegrationsPage.tsx
import { useState, useEffect } from 'react'
import { Github, MessageSquare, Trello, BarChart2, Sparkles } from 'lucide-react'
import { IntegrationCard } from '../../components/integrations/IntegrationCard'
import { ConnectModal } from '../../components/integrations/ConnectModal'
import { CopilotPreviewModal } from '../../components/integrations/CopilotPreviewModal'
import { UnifiedPlatformCard } from '../../components/integrations/UnifiedPlatformCard'
import { getConnections, getUnifiedClient } from '../../lib/unified'
import type { IntegrationConfig } from '../../components/integrations/types'
import type { Connection } from '@unified-api/typescript-sdk/sdk/models/shared'
import type { UnifiedTo } from '@unified-api/typescript-sdk'

const COMPANY_ID = import.meta.env.VITE_COMPANY_ID ?? 'demo-company'
const UNIFIED_API_KEY = import.meta.env.VITE_UNIFIED_API_KEY ?? ''
const WORKSPACE_ID = import.meta.env.VITE_UNIFIED_WORKSPACE_ID ?? ''

// Static fallback cards — shown in demo mode when no Unified API key is set
const STATIC_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'github',
    type: 'github',
    label: 'GitHub',
    description: 'Sync pull requests, commits, and code review activity',
    status: 'not_connected',
    icon: Github,
  },
  {
    id: 'jira',
    type: 'jira',
    label: 'Jira',
    description: 'Import sprints, issues, and velocity data',
    status: 'not_connected',
    icon: Trello,
  },
  {
    id: 'linear',
    type: 'linear',
    label: 'Linear',
    description: 'Import cycles, issues, and team metrics',
    status: 'not_connected',
    icon: BarChart2,
  },
  {
    id: 'slack',
    type: 'slack',
    label: 'Slack',
    description: 'Send burnout alerts and sprint summaries to a channel',
    status: 'not_connected',
    icon: MessageSquare,
  },
]

// Known platforms to surface via Unified.to — matched against fetched connections
interface UnifiedPlatformMeta {
  type: string
  name: string
  description: string
  color: string
}

const UNIFIED_PLATFORMS: UnifiedPlatformMeta[] = [
  { type: 'jira',   name: 'Jira',    description: 'Import sprints, issues, and velocity data',            color: '#0052CC' },
  { type: 'linear', name: 'Linear',  description: 'Import cycles, issues, and team metrics',              color: '#5E6AD2' },
  { type: 'monday', name: 'Monday',  description: 'Sync boards, items, and team progress',                color: '#FF3D57' },
  { type: 'github', name: 'GitHub',  description: 'Sync pull requests, commits, and code review',        color: '#238636' },
  { type: 'slack',  name: 'Slack',   description: 'Send burnout alerts and sprint summaries to a channel', color: '#4A154B' },
  { type: 'teams',  name: 'Teams',   description: 'Send alerts and summaries to Microsoft Teams',         color: '#6264A7' },
]

const COPILOT_INTEGRATION: IntegrationConfig = {
  id: 'copilot',
  type: 'copilot',
  label: 'GitHub Copilot Metrics',
  description: 'Correlate AI credit usage with Jira tasks and sprint velocity',
  status: 'not_connected',
  icon: Sparkles,
  badge: 'New',
}

export function IntegrationsPage() {
  const [staticIntegrations, setStaticIntegrations] = useState(STATIC_INTEGRATIONS)
  const [copilotStatus, setCopilotStatus] = useState<'not_connected' | 'connected'>('not_connected')
  const [active, setActive] = useState<IntegrationConfig | null>(null)
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [connections, setConnections] = useState<Connection[]>([])
  const [unifiedClient, setUnifiedClient] = useState<UnifiedTo | null>(null)

  const isUnifiedMode = !!UNIFIED_API_KEY

  useEffect(() => {
    if (!isUnifiedMode) return
    const client = getUnifiedClient()
    setUnifiedClient(client)
    getConnections(client)
      .then(setConnections)
      .catch(() => setConnections([]))
  }, [isUnifiedMode])

  function handleConnect(integration: IntegrationConfig) {
    if (integration.type === 'copilot') {
      setCopilotOpen(true)
    } else {
      setActive(integration)
    }
  }

  function handleSaved() {
    if (!active) return
    setStaticIntegrations(prev =>
      prev.map(i => i.id === active.id ? { ...i, status: 'connected' } : i)
    )
  }

  function handleCopilotEnable() {
    setCopilotStatus('connected')
    setCopilotOpen(false)
  }

  const copilotCard: IntegrationConfig = { ...COPILOT_INTEGRATION, status: copilotStatus }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100">Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">Connect your tools to start pulling real data into DevPulse.</p>
      </div>

      <div className="space-y-3">
        {isUnifiedMode ? (
          <>
            {UNIFIED_PLATFORMS.map(platform => {
              const connection = connections.find(c => c.integrationType === platform.type) ?? null
              return (
                <UnifiedPlatformCard
                  key={platform.type}
                  platform={platform}
                  connection={connection}
                  workspaceId={WORKSPACE_ID}
                  client={unifiedClient ?? undefined}
                />
              )
            })}
          </>
        ) : (
          staticIntegrations.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onConnect={handleConnect}
            />
          ))
        )}

        {/* Copilot card is always shown */}
        <IntegrationCard
          integration={copilotCard}
          onConnect={handleConnect}
        />
      </div>

      <ConnectModal
        integration={active}
        companyId={COMPANY_ID}
        onClose={() => setActive(null)}
        onSaved={handleSaved}
      />

      {copilotOpen && (
        <CopilotPreviewModal
          onClose={() => setCopilotOpen(false)}
          onEnable={handleCopilotEnable}
        />
      )}
    </div>
  )
}
