import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test('loads and shows spending summary', async ({ page }) => {
    await page.goto('/dashboard')
    // Should show main heading or net spending area
    await expect(page).toHaveURL('/dashboard')
    // Should not redirect to login (auth works)
    await expect(page.getByText(/net/i).first()).toBeVisible()
  })

  test('shows category breakdown with seeded transactions', async ({ page }) => {
    await page.goto('/dashboard')
    // Should show at least one spending category from seeded data
    await expect(page.getByText(/housing/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('navigation links are present', async ({ page }) => {
    await page.goto('/dashboard')
    // Nav should contain links to key sections
    await expect(page.getByRole('link', { name: /transactions/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /accounts/i }).first()).toBeVisible()
  })
})
