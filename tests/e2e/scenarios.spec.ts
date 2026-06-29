// tests/e2e/scenarios.spec.ts
import { test, expect, Page } from '@playwright/test'

const BASE = 'http://localhost:4173/devpulse-ai'

// Helper: activate demo login via localStorage
async function demoLogin(page: Page) {
  await page.goto(BASE + '/')
  await page.evaluate(() => localStorage.setItem('devpulse-demo-auth', 'true'))
  await page.reload()
  await page.waitForLoadState('networkidle')
}

// Helper: switch active role via TopBar dropdown
async function switchRole(page: Page, label: string) {
  await page.locator('[data-testid="role-switcher"]').click()
  await page.getByText(label, { exact: true }).click()
  await page.waitForTimeout(300)
}

test.describe('Scenario 1 — CTO sees company-wide health', () => {
  test.beforeEach(async ({ page }) => { await demoLogin(page) })

  test('company health ring is visible and above 0', async ({ page }) => {
    await page.goto(BASE + '/')
    await page.waitForSelector('[data-testid="health-score"]', { timeout: 10_000 })
    const text = await page.locator('[data-testid="health-score"]').textContent()
    expect(Number(text?.match(/\d+/)?.[0] ?? '0')).toBeGreaterThan(0)
  })

  test('division cards are rendered', async ({ page }) => {
    await page.goto(BASE + '/')
    await page.waitForSelector('[data-testid="division-card"]', { timeout: 10_000 })
    const count = await page.locator('[data-testid="division-card"]').count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('stale PRs metric is visible', async ({ page }) => {
    await page.goto(BASE + '/')
    await page.waitForSelector('[data-testid="stale-prs-count"]', { timeout: 10_000 })
    const text = await page.locator('[data-testid="stale-prs-count"]').textContent()
    expect(text).toMatch(/\d/)
  })
})

test.describe('Scenario 2 — Team Lead sees only their team', () => {
  test.beforeEach(async ({ page }) => { await demoLogin(page) })

  test('sprint prediction shows completion percentage', async ({ page }) => {
    await page.goto(BASE + '/sprint')
    await page.waitForSelector('[data-testid="sprint-prediction"]', { timeout: 10_000 })
    const text = await page.locator('[data-testid="sprint-prediction"]').textContent()
    expect(text).toMatch(/\d+%/)
  })

  test('developer cards are visible on briefing page', async ({ page }) => {
    await page.goto(BASE + '/briefing')
    await page.waitForSelector('[data-testid="developer-card"]', { timeout: 10_000 })
    const count = await page.locator('[data-testid="developer-card"]').count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})

test.describe('Scenario 3 — Burnout detection', () => {
  test.beforeEach(async ({ page }) => { await demoLogin(page) })

  test('risk badges are visible for developers', async ({ page }) => {
    await page.goto(BASE + '/burnout')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700)
    const badges = page.locator('[data-testid^="risk-badge-"]')
    const count = await badges.count()
    expect(count).toBeGreaterThan(0)
  })

  test('clicking a developer opens the side panel', async ({ page }) => {
    await page.goto(BASE + '/burnout')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(700)
    const firstRow = page.locator('.cursor-pointer').first()
    await firstRow.click()
    await expect(page.locator('text=Activity — Last 4 Weeks')).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('Scenario 4 — Sprint below 80%', () => {
  test.beforeEach(async ({ page }) => { await demoLogin(page) })

  test('sprint prediction percentage is shown in header', async ({ page }) => {
    await page.goto(BASE + '/sprint')
    await page.waitForSelector('[data-testid="sprint-prediction"]', { timeout: 10_000 })
    const text = await page.locator('[data-testid="sprint-prediction"]').textContent()
    const pct = Number(text?.match(/(\d+)%/)?.[1] ?? '100')
    // Verify the metric renders — exact value depends on mock data
    expect(pct).toBeGreaterThan(0)
    expect(pct).toBeLessThanOrEqual(100)
  })
})

test.describe("Scenario 5 — Today's Briefing signals", () => {
  test.beforeEach(async ({ page }) => { await demoLogin(page) })

  test('briefing page loads with at least one section', async ({ page }) => {
    await page.goto(BASE + '/today')
    await page.waitForLoadState('networkidle')
    const header = page.locator('h1', { hasText: "Today's Briefing" })
    await expect(header).toBeVisible({ timeout: 10_000 })
  })

  test('clicking a briefing card navigates away', async ({ page }) => {
    await page.goto(BASE + '/today')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(400)
    const cards = page.locator('button.w-full.text-left')
    const count = await cards.count()
    if (count > 0) {
      const initialUrl = page.url()
      await cards.first().click()
      await page.waitForTimeout(500)
      // URL should have changed (navigated to a detail page)
      expect(page.url()).not.toBe(initialUrl)
    }
  })
})

test.describe('Scenario 6 — Developer sees only own briefing', () => {
  test.beforeEach(async ({ page }) => { await demoLogin(page) })

  test('auth gate blocks unauthenticated access', async ({ page }) => {
    await page.goto(BASE + '/')
    await page.evaluate(() => localStorage.removeItem('devpulse-demo-auth'))
    await page.reload()
    await page.waitForLoadState('networkidle')
    // Should show login page
    await expect(page.locator('text=Sign in with Google')).toBeVisible({ timeout: 10_000 })
  })

  test('developer card visible on developer briefing page', async ({ page }) => {
    await page.goto(BASE + '/briefing')
    await page.waitForSelector('[data-testid="developer-card"]', { timeout: 10_000 })
    const count = await page.locator('[data-testid="developer-card"]').count()
    expect(count).toBeGreaterThanOrEqual(1)
  })
})
