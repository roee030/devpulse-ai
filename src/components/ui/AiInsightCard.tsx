import { Sparkles } from 'lucide-react'

interface AiInsightCardProps {
  text: string
}

export function AiInsightCard({ text }: AiInsightCardProps) {
  return (
    <div className="bg-card border border-border border-l-4 border-l-accent rounded-xl p-4 mb-6 flex gap-3">
      <Sparkles size={16} className="text-accent flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-accent text-xs font-semibold mb-1 uppercase tracking-wide">AI Insight</p>
        <p className="text-text-secondary text-sm leading-relaxed">{text}</p>
      </div>
    </div>
  )
}
