const AGENT = 'http://localhost:9339'

function row(label, value) {
  const div = document.createElement('div')
  div.className = 'row'
  const l = document.createElement('span'); l.className = 'label'; l.textContent = label
  const v = document.createElement('span'); v.className = 'val';   v.textContent = value
  div.append(l, v)
  return div
}

function status(text, isError = false) {
  const p = document.createElement('p')
  p.className = 'status' + (isError ? ' err' : '')
  if (!isError) { const dot = document.createElement('span'); dot.className = 'dot'; p.append(dot) }
  p.append(document.createTextNode(text))
  return p
}

async function load() {
  const el = document.getElementById('content')
  el.innerHTML = ''
  try {
    const r = await fetch(`${AGENT}/status`, { signal: AbortSignal.timeout(2000) })
    const d = await r.json()

    el.append(
      row('Branch', d.branch ?? '—'),
      row('Task',   d.taskId ?? '—'),
      row('Today',  `${(d.todayTokens ?? 0).toLocaleString()} tokens`),
    )

    const entries = Object.entries(d.summary ?? {})
      .sort((a, b) => b[1].tokens - a[1].tokens)
      .slice(0, 6)

    if (entries.length) {
      const hdr = document.createElement('div')
      hdr.style.cssText = 'margin-top:10px;font-size:10px;color:#8b949e;text-transform:uppercase;letter-spacing:.08em'
      hdr.textContent = 'Per task'
      el.append(hdr)
      entries.forEach(([task, s]) => el.append(row(task, `${s.tokens.toLocaleString()} tok`)))
    }

    el.append(status('Agent connected'))
  } catch {
    const p = document.createElement('p')
    p.className = 'status err'
    p.textContent = '⚠ Agent offline — run: npx tsx agent/devpulse-agent.ts'
    el.append(p)
  }
}

load()
