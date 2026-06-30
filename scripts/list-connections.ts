// scripts/list-connections.ts
// Run once locally to find your Unified.to connection IDs.
// Usage: UNIFIED_API_KEY=xxx npx tsx scripts/list-connections.ts
import { UnifiedTo } from '@unified-api/typescript-sdk'

const API_KEY = process.env.UNIFIED_API_KEY ?? ''

if (!API_KEY) {
  console.error('Usage: UNIFIED_API_KEY=your_key npx tsx scripts/list-connections.ts')
  process.exit(1)
}

const sdk = new UnifiedTo({ security: { jwt: API_KEY } })

const KNOWN: Record<string, string> = {
  jira:   'UNIFIED_JIRA_CONNECTION_ID',
  linear: 'UNIFIED_LINEAR_CONNECTION_ID',
  monday: 'UNIFIED_MONDAY_CONNECTION_ID',
  github: 'UNIFIED_GITHUB_CONNECTION_ID',
  slack:  'UNIFIED_SLACK_CONNECTION_ID',
  msteams:'UNIFIED_TEAMS_CONNECTION_ID',
}

const connections = await sdk.unified.listUnifiedConnections({})

if (connections.length === 0) {
  console.log('No connections found. Make sure you connected platforms in the Unified.to dashboard.')
  process.exit(0)
}

console.log('\n── Active connections ───────────────────────────────────────')
for (const c of connections) {
  const type = c.integrationType ?? 'unknown'
  console.log(`  ${type.padEnd(10)}  ${c.id}`)
}

console.log('\n── Paste this into your .env.local ─────────────────────────')
for (const c of connections) {
  const type = c.integrationType ?? ''
  const envKey = KNOWN[type]
  if (envKey) console.log(`${envKey}=${c.id}`)
  else        console.log(`# ${type.toUpperCase()}_CONNECTION_ID=${c.id}`)
}
console.log('─────────────────────────────────────────────────────────────\n')
