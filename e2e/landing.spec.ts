import { test, expect } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } }) // no auth

test.describe('Landing page', () => {
  test('renders the value proposition', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('OPENQUILL')).toBeVisible()
    await expect(page.getByText('Paste your bank statement')).toBeVisible()
  })

  test('CTA button links to login', async ({ page }) => {
    await page.goto('/')
    const cta = page.getByRole('link', { name: /get started/i })
    await expect(cta).toBeVisible()
    await cta.click()
    await page.waitForURL('/login')
  })

  test('login page renders magic link form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /send magic link/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })

  test('unauthenticated dashboard redirect to login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('/login')
  })
})
