// src/components/integrations/CopilotPreviewModal.tsx
import { X, Sparkles, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'

const mockData = [
  { dev: 'Alice',  credits: 142, points: 18 },
  { dev: 'Tom',    credits: 89,  points: 14 },
  { dev: 'Noa',    credits: 210, points: 12 },
  { dev: 'David',  credits: 54,  points: 11 },
  { dev: 'Sara',   credits: 176, points: 16 },
]

interface Props {
  onClose: () => void
  onEnable: () => void
}

export function CopilotPreviewModal({ onClose, onEnable }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-100">GitHub Copilot Metrics</h2>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  New
                </span>
              </div>
              <p className="text-xs text-slate-500">Correlate AI credit usage with Jira tasks</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview content */}
        <div className="p-5 space-y-5">
          {/* Insight banner */}
          <div className="flex items-start gap-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3.5">
            <TrendingUp className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
            <p className="text-indigo-300 text-xs leading-relaxed">
              Developers using Copilot actively deliver <span className="font-semibold">23% more story points</span> per sprint on average. Noa is using 3× the team average — consider pairing on complex tasks.
            </p>
          </div>

          {/* Chart */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">AI Credits Used · Last Sprint</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="dev" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
                    itemStyle={{ color: '#818cf8' }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="credits" fill="#6366f1" radius={[3, 3, 0, 0]} name="Credits" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Efficiency table */}
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">AI Credit Efficiency</p>
            <div className="space-y-1.5">
              {mockData.map(d => (
                <div key={d.dev} className="flex items-center gap-3 text-xs">
                  <span className="text-slate-400 w-12">{d.dev}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.round((d.credits / 210) * 100)}%` }}
                    />
                  </div>
                  <span className="text-slate-300 w-20 text-right">{d.credits} cr / {d.points} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 p-5 border-t border-slate-800">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={onEnable}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Enable Copilot Metrics
          </button>
        </div>
      </div>
    </div>
  )
}
