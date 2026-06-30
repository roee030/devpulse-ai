// src/components/integrations/types.ts
import type { ComponentType } from 'react'

export type IntegrationStatus = 'connected' | 'error' | 'not_connected'

export interface IntegrationConfig {
  id: string
  type: 'github' | 'jira' | 'linear' | 'slack' | 'copilot'
  label: string
  description: string
  status: IntegrationStatus
  icon: ComponentType<{ className?: string }>
  badge?: string
}
