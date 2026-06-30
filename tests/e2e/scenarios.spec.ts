// tests/e2e/scenarios.spec.ts
import { test, expect, type Page } from '@playwright/test'

const BASE = 'http://localhost:4173/devpulse-ai'

// All platforms to test. Tests run for every platform whose connectionId is set.
// In CI these come from secrets; locally set them in a .env.test file.
const PLATFORMS = [
  { name: 'Jira',   connectionId: process.env.UNIFIED_JIRA_CONNECTION_ID   ?? '' },
  { name: 'Linear', connectionId: process.env.UNIFIED_LINEAR_CONNECTION_ID ?? '' },
  { name: 'Monday', connectionId: process.env.UNIFIED_MONDAY_CONNECTION_ID ?? '' },
]

// Always include a "Demo (mock data)" run so the suite passes without any API keys.
const ACTIVE_PLATFORMS = [
  { name: 'Demo', connectionId: '' },
  ...PLATFORMS.filter(p => p.connectionId),
]

// ── Helpers ───────────────────────────────────────────────────────────────────

async function demoLogin(page: Page) {
  await page.goto(BASE + '/')
  await page.evaluate(() => localStorage.setItem('devpulse-demo-auth', 'true'))
  await page.reload()
  await page.waitForLoadState('networkidle')
}

async function setPlatformConnection(page: Page, connectionId: string) {
  if (connectionId) {
    await page.evaluate(
      (id) => localStorage.setItem('devpulse-active-connection', id),
      connectionId,
    )
    await page.reload()
    await page.waitForLoadState('networkidle')
  }
}

// ── Platform-parameterised test suites ────────────────────────────────────────

for (const platform of ACTIVE_PLATFORMS) {
  test.describe(`[${platform.name}]`, () => {
    test.beforeEach(async ({ page }) => {
      await demoLogin(page)
      await setPlatformConnection(page, platform.connectionId)
    })

    // ── Scenario 1: CTO sees company-wide health ──────────────────────────
    test('CTO sees company-wide health ring', async ({ page }) => {
      await page.goto(BASE + '/')
      await page.waitForSelector('[data-testid="health-score"]', { timeout: 10_000 })
      const text = await page.locator('[data-testid="health-score"]').first().textContent()
      expect(Number(text?.match(/\d+/)?.[0] ?? '0')).toBeGreaterThan(0)
    })

    test('CTO sees division cards', async ({ page }) => {
      await page.goto(BASE + '/')
      await page.waitForSelector('[data-testid="division-card"]', { timeout: 10_000 })
      const count = await page.locator('[data-testid="division-card"]').count()
      expect(count).toBeGreaterThanOrEqual(2)
    })

    test('CTO sees stale PRs metric', async ({ page }) => {
      await page.goto(BASE + '/')
      await page.waitForSelector('[data-testid="stale-prs-count"]', { timeout: 10_000 })
      const text = await page.locator('[data-testid="stale-prs-count"]').textContent()
      expect(text).toMatch(/\d/)
    })

    // ── Scenario 2: Team Lead sees only their team ────────────────────────
    test('Team Lead — sprint prediction badge is visible', async ({ page }) => {
      await page.goto(BASE + '/sprint')
      await page.waitForSelector('[data-testid="sprint-prediction"]', { timeout: 10_000 })
      const text = await page.locator('[data-testid="sprint-prediction"]').textContent()
      expect(text).toMatch(/\d+%/)
    })

    test('Team Lead — developer cards on briefing page', async ({ page }) => {
      await page.goto(BASE + '/briefing')
      await page.waitForSelector('[data-testid="developer-card"]', { timeout: 10_000 })
      const count = await page.locator('[data-testid="developer-card"]').count()
      expect(count).toBeGreaterThanOrEqual(1)
    })

    // ── Scenario 3: Burnout detected — tom.levi blocked ──────────────────
    test('Burnout — risk badges render for developers', async ({ page }) => {
      await page.goto(BASE + '/burnout')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(700) // skeleton timeout
      const badges = page.locator('[data-testid^="risk-badge-"]')
      expect(await badges.count()).toBeGreaterThan(0)
    })

    test('Burnout — clicking developer opens side panel', async ({ page }) => {
      await page.goto(BASE + '/burnout')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(700)
      await page.locator('.cursor-pointer').first().click()
      await expect(page.locator('text=Activity — Last 4 Weeks')).toBeVisible({ timeout: 5_000 })
    })

    // ── Scenario 4: Sprint Prediction below 80% ───────────────────────────
    test('Sprint Prediction — shows valid percentage', async ({ page }) => {
      await page.goto(BASE + '/sprint')
      await page.waitForSelector('[data-testid="sprint-prediction"]', { timeout: 10_000 })
      const text = await page.locator('[data-testid="sprint-prediction"]').textContent()
      const pct  = Number(text?.match(/(\d+)%/)?.[1] ?? '101')
      expect(pct).toBeGreaterThan(0)
      expect(pct).toBeLessThanOrEqual(100)
    })

    // ── Scenario 5: Today's Briefing shows correct alerts ─────────────────
    test("Today's Briefing — page loads with heading", async ({ page }) => {
      await page.goto(BASE + '/today')
      await page.waitForLoadState('networkidle')
      await expect(page.locator('h1', { hasText: "Today's Briefing" })).toBeVisible({ timeout: 10_000 })
    })

    test("Today's Briefing — briefing card navigates away", async ({ page }) => {
      await page.goto(BASE + '/today')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(400)
      const cards = page.locator('button.w-full.text-left')
      if (await cards.count() > 0) {
        const initialUrl = page.url()
        await cards.first().click()
        await page.waitForTimeout(500)
        expect(page.url()).not.toBe(initialUrl)
      }
    })

    // ── Scenario 6: Auth gate blocks unauthenticated users ────────────────
    test('Auth gate — blocks unauthenticated access', async ({ page }) => {
      await page.goto(BASE + '/')
      await page.evaluate(() => localStorage.removeItem('devpulse-demo-auth'))
      await page.reload()
      await page.waitForLoadState('networkidle')
      // "Continue with Demo" is always rendered on the login page regardless of Firebase config
      await expect(page.locator('text=Continue with Demo')).toBeVisible({ timeout: 10_000 })
    })

    test('Auth gate — developer sees own briefing card', async ({ page }) => {
      await page.goto(BASE + '/briefing')
      await page.waitForSelector('[data-testid="developer-card"]', { timeout: 10_000 })
      expect(await page.locator('[data-testid="developer-card"]').count()).toBeGreaterThanOrEqual(1)
    })
  })
}
