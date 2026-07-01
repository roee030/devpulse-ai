// src/pages/Onboarding.tsx
// 3-step company onboarding wizard shown on first login.
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, Building2, Plug, Cpu, Copy, CheckCheck } from 'lucide-react'
import { useCompanyName } from '../context/CompanyContext'

const PENDING_ROUTE_KEY = 'devpulse-pending-route'

const PLATFORMS = [
  { type: 'jira',   name: 'Jira',    color: '#0052CC', desc: 'Issues & sprints' },
  { type: 'linear', name: 'Linear',  color: '#5E6AD2', desc: 'Cycles & projects' },
  { type: 'monday', name: 'Monday',  color: '#FF3D57', desc: 'Boards & items' },
  { type: 'github', name: 'GitHub',  color: '#238636', desc: 'PRs & code review' },
  { type: 'slack',  name: 'Slack',   color: '#4A154B', desc: 'Alerts & standups' },
  { type: 'teams',  name: 'Teams',   color: '#6264A7', desc: 'Microsoft alerts' },
]

const AGENT_CMD = 'npx devpulse-agent'

interface Props {
  onComplete: () => void
}

export function Onboarding({ onComplete }: Props) {
  const { companyName, setCompanyName } = useCompanyName()
  const [step, setStep] = useState(0)
  const [inputName, setInputName] = useState(companyName)
  const [copied, setCopied] = useState(false)

  function handleNameNext() {
    const trimmed = inputName.trim()
    if (!trimmed) return
    setCompanyName(trimmed)
    setStep(1)
  }

  function handleCopy() {
    navigator.clipboard.writeText(AGENT_CMD).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const steps = [
    { icon: Building2, label: 'Company' },
    { icon: Plug,      label: 'Connect' },
    { icon: Cpu,       label: 'AI Agent' },
  ]

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <span className="text-white text-sm font-bold">DP</span>
          </div>
          <span className="text-text-primary font-semibold text-lg">DevPulse AI</span>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {steps.map(({ icon: Icon, label }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                i < step ? 'text-success' : i === step ? 'text-accent' : 'text-text-secondary'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                  i < step
                    ? 'bg-success/15 border-success/40'
                    : i === step
                    ? 'bg-accent/15 border-accent/40'
                    : 'bg-card border-border'
                }`}>
                  {i < step ? <Check size={12} /> : <Icon size={12} />}
                </div>
                <span className="hidden sm:block">{label}</span>
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-px transition-colors ${i < step ? 'bg-success/40' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl p-8"
            >
              <h1 className="text-text-primary text-xl font-semibold mb-1">Welcome to DevPulse</h1>
              <p className="text-text-secondary text-sm mb-6">
                Let's get your workspace set up. Start with your company name.
              </p>

              <label className="block text-xs font-medium text-text-secondary mb-2">Company name</label>
              <input
                autoFocus
                type="text"
                value={inputName}
                onChange={e => setInputName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleNameNext()}
                placeholder="Acme Corp"
                className="w-full bg-bg border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-accent/60 transition-colors"
              />

              <button
                onClick={handleNameNext}
                disabled={!inputName.trim()}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Continue <ArrowRight size={15} />
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl p-8"
            >
              <h1 className="text-text-primary text-xl font-semibold mb-1">Connect your tools</h1>
              <p className="text-text-secondary text-sm mb-6">
                Add integrations in Settings → Integrations after setup. DevPulse works in demo mode until you connect.
              </p>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {PLATFORMS.map(p => (
                  <div key={p.type}
                    className="flex items-center gap-3 bg-bg border border-border rounded-xl px-4 py-3"
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: p.color }}
                    >
                      {p.name[0]}
                    </div>
                    <div>
                      <p className="text-text-primary text-xs font-medium">{p.name}</p>
                      <p className="text-text-secondary text-[10px]">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 px-4 py-2.5 text-sm text-text-secondary border border-border rounded-lg hover:text-text-primary hover:border-border/80 transition-colors"
                >
                  Set up later
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem(PENDING_ROUTE_KEY, '/settings/integrations')
                    onComplete()
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Connect now <ArrowRight size={15} />
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl p-8"
            >
              <h1 className="text-text-primary text-xl font-semibold mb-1">Install the AI agent</h1>
              <p className="text-text-secondary text-sm mb-6">
                Run on each developer's machine to track Copilot token usage per Jira task.
                <span className="text-text-secondary/60"> (Optional — dashboard works without it.)</span>
              </p>

              <div className="bg-bg border border-border rounded-xl px-4 py-3 flex items-center justify-between gap-3 mb-6 font-mono text-sm">
                <code className="text-accent">{AGENT_CMD}</code>
                <button
                  onClick={handleCopy}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
                  title="Copy command"
                >
                  {copied ? <CheckCheck size={14} className="text-success" /> : <Copy size={14} />}
                </button>
              </div>

              <p className="text-text-secondary text-xs mb-6">
                The agent runs at <code className="text-text-primary">http://localhost:9339</code> and automatically links commits to Jira task IDs via your git branch name.
              </p>

              <button
                onClick={onComplete}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent/90 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Go to dashboard <ArrowRight size={15} />
              </button>

              <button
                onClick={onComplete}
                className="mt-3 w-full text-center text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                Skip for now
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-center text-xs text-text-secondary mt-6 opacity-50">
          DevPulse AI · {companyName || 'Your workspace'}
        </p>
      </div>
    </div>
  )
}
