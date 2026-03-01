import { test, expect } from '@playwright/test'

test.describe('Transactions', () => {
  test('shows seeded transactions', async ({ page }) => {
    await page.goto('/transactions')
    await expect(page.getByText('Paycheck')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Rent Payment')).toBeVisible()
  })

  test('search filters transactions', async ({ page }) => {
    await page.goto('/transactions')

    await page.getByLabel(/search/i).fill('Netflix')

    // Netflix should be visible, Rent Payment should not
    await expect(page.getByText('Netflix')).toBeVisible()
    await expect(page.getByText('Rent Payment')).not.toBeVisible()
  })

  test('category filter works', async ({ page }) => {
    await page.goto('/transactions')

    await page.getByLabel(/filter by category/i).selectOption('Subscriptions')

    // Should show Netflix and Spotify but not Rent Payment
    await expect(page.getByText('Netflix')).toBeVisible()
    await expect(page.getByText('Rent Payment')).not.toBeVisible()
  })

  test('can expand and edit a transaction category', async ({ page }) => {
    await page.goto('/transactions')

    // Click on Netflix transaction to expand edit panel
    await page.getByRole('button', { name: /netflix/i }).first().click()

    // Edit panel should appear
    await expect(page.getByLabel(/category/i).last()).toBeVisible()

    // Change category
    await page.getByLabel(/category/i).last().selectOption('Shopping')

    // Save
    await page.getByRole('button', { name: /save/i }).first().click()

    // Should show success (no error, panel closes or persists with new value)
    await expect(page.getByText(/saving/i)).not.toBeVisible({ timeout: 5000 })
  })

  test('shows transaction count', async ({ page }) => {
    await page.goto('/transactions')
    // Should show "X of Y" transaction count
    await expect(page.locator('text=/\\d+ of \\d+/')).toBeVisible()
  })
})
