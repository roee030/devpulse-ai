// src/components/ui/ActivityHeatmap.tsx
const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function cellColor(value: number) {
  if (value === 0) return 'bg-border'
  if (value <= 2) return 'bg-accent/20'
  if (value <= 4) return 'bg-accent/40'
  if (value <= 6) return 'bg-accent/70'
  return 'bg-accent'
}

export function ActivityHeatmap({ data }: { data: number[][] }) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map(d => <span key={d} className="text-text-secondary text-xs text-center">{d}</span>)}
      </div>
      <div className="space-y-1">
        {data.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((val, di) => (
              <div
                key={di}
                title={`${val} commits`}
                className={`h-4 rounded-sm ${cellColor(val)}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
