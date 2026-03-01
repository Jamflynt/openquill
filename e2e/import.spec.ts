import { test, expect } from '@playwright/test'

const MOCK_PARSE_RESPONSE = {
  institution: 'Test Bank',
  endingBalance: 4876.43,
  remainingParses: 8,
  transactions: [
    { date: '2026-01-15', description: 'Grocery Store', amount: -95.43, suggestedCategory: 'Food & Groceries', isIncome: false, isTransfer: false },
    { date: '2026-01-14', description: 'Direct Deposit', amount: 2800.00, suggestedCategory: 'Income', isIncome: true, isTransfer: false },
    { date: '2026-01-13', description: 'Gas Station', amount: -52.10, suggestedCategory: 'Transportation', isIncome: false, isTransfer: false },
  ],
}

test.describe('Statement import', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the parse endpoint
    await page.route('/api/statements/parse', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_PARSE_RESPONSE),
      })
    })
  })

  test('shows paste step initially', async ({ page }) => {
    await page.goto('/statements/import')
    await expect(page.getByText(/step 1/i)).toBeVisible()
    await expect(page.getByPlaceholder(/paste/i)).toBeVisible()
  })

  test('progresses through full import flow', async ({ page }) => {
    await page.goto('/statements/import')

    // Step 1: paste text
    await page.getByPlaceholder(/paste/i).fill('BANK STATEMENT\nDate Description Amount\n01/15 Grocery Store -95.43\n01/14 Direct Deposit 2800.00\n01/13 Gas Station -52.10')

    // Select account (should auto-select or show dropdown with Test Checking)
    // Try to click Parse button
    await page.getByRole('button', { name: /parse/i }).click()

    // Step 2: parsing state
    await expect(page.getByText(/step 2/i)).toBeVisible({ timeout: 5000 })

    // Step 3: review (mock responds immediately)
    await expect(page.getByText(/step 3/i)).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Grocery Store')).toBeVisible()
    await expect(page.getByText('Direct Deposit')).toBeVisible()

    // Confirm import
    await page.getByRole('button', { name: /confirm|import|save/i }).first().click()

    // Should show success state
    await expect(page.getByText(/import complete|success/i)).toBeVisible({ timeout: 15000 })
  })

  test('shows error for empty paste', async ({ page }) => {
    await page.goto('/statements/import')
    await page.getByRole('button', { name: /parse/i }).click()
    // Should show validation error (paste area should be non-empty)
    // The form should not advance to step 2
    await expect(page.getByText(/step 1/i)).toBeVisible()
  })
})
