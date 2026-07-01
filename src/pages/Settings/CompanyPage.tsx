// src/pages/Settings/CompanyPage.tsx
import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useCompanyName } from '../../context/CompanyContext'

const COMPANY_ID = import.meta.env.VITE_COMPANY_ID ?? 'demo-company'
const LS_PLAN_KEY = 'devpulse-company-plan'

export function CompanyPage() {
  const { companyName, setCompanyName } = useCompanyName()
  const [name, setName]         = useState(companyName)
  const [plan, setPlan]         = useState<'free' | 'pro' | 'enterprise'>(
    () => (localStorage.getItem(LS_PLAN_KEY) as 'free' | 'pro' | 'enterprise') ?? 'free'
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Sync from context (updated by onboarding or other sessions)
  useEffect(() => {
    setName(companyName)
  }, [companyName])

  // If Firebase is available, try to load saved settings
  useEffect(() => {
    if (!db) return
    getDoc(doc(db, 'companies', COMPANY_ID)).then(snap => {
      if (!snap.exists()) return
      const data = snap.data()
      if (data.name && !companyName) {
        setName(data.name)
        setCompanyName(data.name)
      }
      if (data.plan) setPlan(data.plan)
    }).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    setIsSaving(true)
    setSaved(false)
    setError(null)
    try {
      // Always persist to context + localStorage
      setCompanyName(name)
      localStorage.setItem(LS_PLAN_KEY, plan)
      // Persist to Firebase if available
      if (db) {
        await setDoc(doc(db!, 'companies', COMPANY_ID), { name, plan }, { merge: true })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      // If Firebase fails, still show saved (localStorage already updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      if (db) setError((e as Error).message ?? 'Cloud sync failed — saved locally')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-100">Company settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your organization profile.</p>
        {!db && (
          <p className="text-xs text-amber-400/80 mt-2 bg-amber-400/5 border border-amber-400/20 rounded-lg px-3 py-2">
            Settings are saved locally. Add Firebase credentials in <code className="font-mono">.env.local</code> to sync across your team.
          </p>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Company name</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Acme Corp"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Plan</label>
          <select
            value={plan}
            onChange={e => setPlan(e.target.value as typeof plan)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {isSaving
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
              : saved
              ? <><Save className="w-3.5 h-3.5" /> Saved!</>
              : <><Save className="w-3.5 h-3.5" /> Save changes</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
