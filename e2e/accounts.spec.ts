import { test, expect } from '@playwright/test'

test.describe('Accounts', () => {
  test('shows seeded accounts', async ({ page }) => {
    await page.goto('/accounts')
    await expect(page.getByText('Test Checking')).toBeVisible()
    await expect(page.getByText('Test Credit')).toBeVisible()
  })

  test('can add a new account', async ({ page }) => {
    await page.goto('/accounts')
    await page.getByRole('button', { name: /add account/i }).click()

    // Dialog should appear
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByLabel(/account name/i).fill('E2E Savings Account')
    await page.getByLabel(/type/i).selectOption('savings')
    await page.getByLabel(/institution/i).fill('Test Bank')
    await page.getByLabel(/current balance/i).fill('1000')

    await page.getByRole('button', { name: /add account/i }).last().click()

    // Should show the new account
    await expect(page.getByText('E2E Savings Account')).toBeVisible({ timeout: 10000 })
  })

  test('account detail page shows transactions', async ({ page }) => {
    await page.goto('/accounts')
    // Click on Test Checking to go to detail page
    await page.getByText('Test Checking').click()
    await page.waitForURL(/\/accounts\/.+/)

    // Should show account name and transactions
    await expect(page.getByText('Test Checking')).toBeVisible()
    await expect(page.getByText(/spending/i).first()).toBeVisible()
  })

  test('can delete the E2E test account', async ({ page }) => {
    await page.goto('/accounts')

    // Find E2E Savings Account and delete it
    const card = page.locator('[data-testid="account-card"]').filter({ hasText: 'E2E Savings Account' })
    // If no data-testid, look for delete button near the account name
    const deleteBtn = page.getByRole('button', { name: /remove|delete/i }).first()

    // Try to find delete button — may need to look in page
    // Click delete button for E2E account
    const accountSection = page.locator('text=E2E Savings Account').locator('..').locator('..')
    await accountSection.getByRole('button').filter({ hasText: /×|remove|delete/i }).click().catch(async () => {
      // Fallback: look for a button near the text
      await page.locator('button').filter({ hasText: /remove|×/i }).first().click()
    })

    // Confirm deletion dialog
    const confirmBtn = page.getByRole('button', { name: /remove|confirm|yes/i }).last()
    await confirmBtn.click()

    // Account should no longer be visible
    await expect(page.getByText('E2E Savings Account')).not.toBeVisible({ timeout: 10000 })
  })
})
