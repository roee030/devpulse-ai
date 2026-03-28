// src/components/integrations/ConnectModal.tsx
import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { IntegrationConfig } from './types'

const FIELDS: Record<string, { label: string; key: string; placeholder: string; type?: string }[]> = {
  github: [
    { label: 'Organization', key: 'org', placeholder: 'my-org' },
    { label: 'Repository', key: 'repo', placeholder: 'my-repo' },
    { label: 'Personal Access Token', key: 'token', placeholder: 'ghp_...', type: 'password' },
  ],
  jira: [
    { label: 'Domain', key: 'domain', placeholder: 'mycompany.atlassian.net' },
    { label: 'Project Key', key: 'projectKey', placeholder: 'ENG' },
    { label: 'API Token', key: 'token', placeholder: 'ATATT...', type: 'password' },
    { label: 'Email', key: 'email', placeholder: 'you@company.com' },
  ],
  linear: [
    { label: 'API Key', key: 'token', placeholder: 'lin_api_...', type: 'password' },
    { label: 'Team ID', key: 'teamId', placeholder: 'team-id' },
  ],
  slack: [
    { label: 'Bot Token', key: 'token', placeholder: 'xoxb-...', type: 'password' },
    { label: 'Channel ID', key: 'channelId', placeholder: 'C0XXXXXXXX' },
  ],
}

interface Props {
  integration: IntegrationConfig | null
  companyId: string
  onClose: () => void
  onSaved: () => void
}

export function ConnectModal({ integration, companyId, onClose, onSaved }: Props) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!integration) return null

  const fields = FIELDS[integration.type] ?? []

  async function handleSave() {
    setIsSaving(true)
    setError(null)
    try {
      await setDoc(
        doc(db, 'companies', companyId, 'integrations', integration!.id),
        { type: integration!.type, config: values, status: 'active', lastSynced: serverTimestamp() },
      )
      onSaved()
      onClose()
    } catch (e: any) {
      setError(e.message ?? 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">Connect {integration.label}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">{f.label}</label>
              <input
                type={f.type ?? 'text'}
                placeholder={f.placeholder}
                value={values[f.key] ?? ''}
                onChange={e => setValues(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          ))}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Save connection
          </button>
        </div>
      </div>
    </div>
  )
}
