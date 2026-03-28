// src/pages/Settings/IntegrationsPage.tsx
import { useState } from 'react'
import { Github, MessageSquare, Trello, BarChart2 } from 'lucide-react'
import { IntegrationCard } from '../../components/integrations/IntegrationCard'
import { ConnectModal } from '../../components/integrations/ConnectModal'
import type { IntegrationConfig } from '../../components/integrations/types'

// Fallback companyId — replace with real value from AuthContext when VITE_DATA_PROVIDER=firebase
const COMPANY_ID = import.meta.env.VITE_COMPANY_ID ?? 'demo-company'

const INTEGRATIONS: IntegrationConfig[] = [
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

export function IntegrationsPage() {
  const [integrations, setIntegrations] = useState(INTEGRATIONS)
  const [active, setActive] = useState<IntegrationConfig | null>(null)

  function handleSaved() {
    if (!active) return
    setIntegrations(prev =>
      prev.map(i => i.id === active.id ? { ...i, status: 'connected' } : i)
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100">Integrations</h1>
        <p className="text-sm text-slate-500 mt-1">Connect your tools to start pulling real data into DevPulse.</p>
      </div>

      <div className="space-y-3">
        {integrations.map(integration => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={setActive}
          />
        ))}
      </div>

      <ConnectModal
        integration={active}
        companyId={COMPANY_ID}
        onClose={() => setActive(null)}
        onSaved={handleSaved}
      />
    </div>
  )
}
