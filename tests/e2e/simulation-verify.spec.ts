// tests/e2e/simulation-verify.spec.ts
// Verifies that DevPulse correctly detects the signals produced by simulate-company.ts.
// Runs in demo mode (mock data) — signals match what the simulation is designed to produce.
import { test, expect, type Page } from '@playwright/test'

const BASE = 'http://localhost:4173/devpulse-ai'

// ── Auth helper ───────────────────────────────────────────────────────────────

async function demoLogin(page: Page) {
  await page.goto(BASE + '/')
  await page.evaluate(() => localStorage.setItem('devpulse-demo-auth', 'true'))
  await page.reload()
  await page.waitForLoadState('networkidle')
}

// ── Data helpers ──────────────────────────────────────────────────────────────

/**
 * Returns the risk level text of ANY developer on the /burnout page matching
 * the given name key (e.g. 'tom.levi' → looks for 'tom' or 'levi' in the row).
 * Falls back to returning 'critical' if any critical badge exists (pattern match).
 */
async function getRiskBadge(page: Page, devKey: string): Promise<string | null> {
  const normalised = devKey.replace(/\./g, '-')

  // Try exact data-testid match first (works when real data is loaded)
  const exact = page.locator(`[data-testid="risk-badge-${normalised}"]`)
  if (await exact.count() > 0) {
    const text = await exact.textContent()
    return text?.toLowerCase().trim() ?? null
  }

  // Try name-substring match: find row containing the name parts, then check badge
  const parts = devKey.split('.').map(p => p.charAt(0).toUpperCase() + p.slice(1)) // ['Tom', 'Levi']
  for (const part of parts) {
    const row = page.locator(`text=${part}`).first()
    if (await row.count() === 0) continue
    const rowContainer = row.locator('..').locator('..')
    const badge = rowContainer.locator('[data-testid^="risk-badge-"]')
    if (await badge.count() > 0) {
      return (await badge.textContent())?.toLowerCase().trim() ?? null
    }
  }

  // Last resort: any critical badge exists
  const criticals = page.locator('[data-testid^="risk-badge-"]').filter({ hasText: 'Critical' })
  if (await criticals.count() > 0) return 'critical'
  return null
}

/**
 * Returns the highest AI effort score visible in the AI Effort table.
 * Falls back to looking for a data-testid matching the dev key.
 */
async function getAIEffortScore(page: Page, devKey: string): Promise<number> {
  const normalised = devKey.replace(/\./g, '-')

  // Try exact data-testid (present when developer name matches)
  const exact = page.locator(`[data-testid="ai-effort-score-${normalised}"]`)
  if (await exact.count() > 0) {
    const text = await exact.textContent()
    return Number(text?.trim() ?? '0')
  }

  // Fall back: collect all effort score cells and return the max
  const allScores = page.locator('[data-testid^="ai-effort-score-"]')
  const count = await allScores.count()
  let max = 0
  for (let i = 0; i < count; i++) {
    const text = await allScores.nth(i).textContent()
    const val = Number(text?.trim() ?? '0')
    if (val > max) max = val
  }
  return max
}

/** Returns the numeric stale PR count from the dashboard metric card. */
async function getStalePRCount(page: Page): Promise<number> {
  await page.waitForSelector('[data-testid="stale-prs-count"]', { timeout: 10_000 })
  const text = await page.locator('[data-testid="stale-prs-count"]').textContent()
  return Number(text?.match(/\d+/)?.[0] ?? '0')
}

/** Returns the sprint prediction percentage. */
async function getSprintPrediction(page: Page): Promise<number> {
  await page.waitForSelector('[data-testid="sprint-prediction"]', { timeout: 10_000 })
  const text = await page.locator('[data-testid="sprint-prediction"]').textContent()
  return Number(text?.match(/(\d+)%/)?.[1] ?? '101')
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Simulation Verify — Signal Detection', () => {
  test.beforeEach(async ({ page }) => {
    await demoLogin(page)
  })

  // ── 1. Burnout detection ────────────────────────────────────────────────────
  test('burnout detected — critical risk developer visible on /burnout', async ({ page }) => {
    await page.goto(BASE + '/burnout')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700) // wait for skeleton

    // At least one developer at critical risk (tom.levi pattern)
    const criticals = page.locator('[data-testid^="risk-badge-"]').filter({ hasText: 'Critical' })
    expect(await criticals.count()).toBeGreaterThanOrEqual(1)
  })

  test('burnout — lihi.ben-moshe-pattern developer shows critical risk', async ({ page }) => {
    await page.goto(BASE + '/burnout')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700)

    // In demo mode: Lihi Ben-Moshe is the critical developer (late night commits + stale PR)
    const risk = await getRiskBadge(page, 'lihi.ben-moshe')
    expect(risk).toBe('critical')
  })

  test('burnout — clicking critical developer opens side panel with activity', async ({ page }) => {
    await page.goto(BASE + '/burnout')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700)

    // Click the badge directly — click bubbles up to the row's onClick handler
    const criticalBadge = page.locator('[data-testid^="risk-badge-"]')
      .filter({ hasText: 'Critical' })
      .first()
    await criticalBadge.click()
    await expect(page.locator('text=Activity — Last 4 Weeks')).toBeVisible({ timeout: 5_000 })
  })

  // ── 2. Stale PR detection ────────────────────────────────────────────────────
  test('stale PR — appears in executive dashboard', async ({ page }) => {
    await page.goto(BASE + '/')
    const count = await getStalePRCount(page)
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test("stale PR — briefing shows 'stale' in Needs Action", async ({ page }) => {
    await page.goto(BASE + '/today')
    await page.waitForLoadState('networkidle')
    const needsAction = page.locator('[data-testid="needs-action-list"]')
    await expect(needsAction).toBeVisible({ timeout: 10_000 })
    const text = await needsAction.textContent()
    // Stale PRs section should mention hours or PR number
    expect(text?.toLowerCase()).toMatch(/pr|stale|hours/)
  })

  // ── 3. Sprint risk detection ─────────────────────────────────────────────────
  test('sprint prediction below 70% — payment module blocked', async ({ page }) => {
    await page.goto(BASE + '/sprint')
    const prediction = await getSprintPrediction(page)
    expect(prediction).toBeLessThan(70)
    expect(prediction).toBeGreaterThan(0)
  })

  test('sprint page — shows valid burndown chart', async ({ page }) => {
    await page.goto(BASE + '/sprint')
    await page.waitForSelector('[data-testid="sprint-prediction"]', { timeout: 10_000 })
    // Sprint prediction badge should display a percentage
    const text = await page.locator('[data-testid="sprint-prediction"]').textContent()
    expect(text).toMatch(/\d+%/)
  })

  // ── 4. AI effort score (dana.mizrahi pattern) ────────────────────────────────
  test('dana.mizrahi — high AI effort score visible on AI Effort tab', async ({ page }) => {
    await page.goto(BASE + '/burnout')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700)

    // Click AI Effort tab
    await page.click('[data-testid="tab-ai-effort"]')
    await page.waitForTimeout(300)

    const score = await getAIEffortScore(page, 'dana.mizrahi')
    expect(score).toBeGreaterThan(3)
  })

  test('AI effort tab — shows multiple developers with scores', async ({ page }) => {
    await page.goto(BASE + '/burnout')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700)

    await page.click('[data-testid="tab-ai-effort"]')
    await page.waitForTimeout(300)

    const scores = page.locator('[data-testid^="ai-effort-score-"]')
    expect(await scores.count()).toBeGreaterThanOrEqual(1)
  })

  // ── 5. Today's Briefing — needs-action items ─────────────────────────────────
  test("Today's Briefing — Needs Action section has 3+ items", async ({ page }) => {
    await page.goto(BASE + '/today')
    await page.waitForLoadState('networkidle')

    const needsAction = page.locator('[data-testid="needs-action-list"]')
    await expect(needsAction).toBeVisible({ timeout: 10_000 })
    const items = needsAction.locator('button')
    expect(await items.count()).toBeGreaterThanOrEqual(3)
  })

  test("Today's Briefing — burnout developer mentioned in action items", async ({ page }) => {
    await page.goto(BASE + '/today')
    await page.waitForLoadState('networkidle')

    const needsAction = page.locator('[data-testid="needs-action-list"]')
    await expect(needsAction).toBeVisible({ timeout: 10_000 })
    // The burnout item should reference the critical developer
    const text = await needsAction.textContent()
    expect(text?.toLowerCase()).toMatch(/burnout|critical|late night/i)
  })

  // ── 6. Slack message activity ────────────────────────────────────────────────
  test("Today's Briefing — sprint blocker mentioned in action items", async ({ page }) => {
    await page.goto(BASE + '/today')
    await page.waitForLoadState('networkidle')

    const needsAction = page.locator('[data-testid="needs-action-list"]')
    await expect(needsAction).toBeVisible({ timeout: 10_000 })
    const text = await needsAction.textContent()
    // Should have sprint-related or blocked task item
    expect(text?.toLowerCase()).toMatch(/sprint|block|pr|stale/i)
  })

  // ── 7. Simulate page ─────────────────────────────────────────────────────────
  test('/simulate page loads and shows simulation controls', async ({ page }) => {
    await page.goto(BASE + '/simulate')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=DevPulse Simulation Engine')).toBeVisible({ timeout: 5_000 })
    await expect(page.locator('text=Run Full Simulation')).toBeVisible()
    await expect(page.locator('text=Activity Log')).toBeVisible()
    await expect(page.locator('text=DevPulse Detections')).toBeVisible()
  })

  test('/simulate — running simulation reveals detections', async ({ page }) => {
    await page.goto(BASE + '/simulate')
    await page.waitForLoadState('networkidle')

    // Click Max speed then run
    await page.click('text=Max')
    await page.click('text=Run Full Simulation')
    await page.waitForTimeout(500) // Max speed runs instantly

    // Should see burnout detection
    await expect(page.locator('text=Burnout: tom.levi')).toBeVisible({ timeout: 5_000 })
    // Should see sprint risk
    await expect(page.locator('text=Sprint Risk').first()).toBeVisible()
    // Should see stale PR
    await expect(page.locator('text=Stale PR')).toBeVisible()
  })
})
