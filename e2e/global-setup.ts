import { chromium, FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const TEST_EMAIL = 'quill-playwright-test@playwright.local'

export default async function globalSetup(_config: FullConfig) {
  // ensure auth dir exists
  const authDir = path.join(__dirname, '.auth')
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Create test user (or get existing)
  let userId: string
  const { data: existingUsers } = await adminClient.auth.admin.listUsers()
  const existing = existingUsers?.users?.find((u) => u.email === TEST_EMAIL)
  if (existing) {
    userId = existing.id
    // Clean up existing data
    await adminClient.from('users').delete().eq('id', userId)
    await adminClient.auth.admin.deleteUser(userId)
  }

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email: TEST_EMAIL,
    email_confirm: true,
  })
  if (createError || !newUser.user) throw new Error(`Failed to create test user: ${createError?.message}`)
  userId = newUser.user.id

  // Insert user profile row
  await adminClient.from('users').insert({ id: userId, email: TEST_EMAIL, name: 'Playwright Test' })

  // Generate magic link
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: TEST_EMAIL,
  })
  if (linkError || !linkData.properties?.action_link) throw new Error(`Failed to generate magic link: ${linkError?.message}`)

  const actionLink = linkData.properties.action_link
  // Replace the Supabase URL host with localhost:3000 so Playwright can follow the redirect through our app's /auth/callback
  const localLink = actionLink.replace(
    new URL(supabaseUrl).origin,
    'http://localhost:3000'
  )

  // Open browser and authenticate
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(localLink, { waitUntil: 'networkidle' })
  // Should redirect to /dashboard or /statements/import after auth callback
  await page.waitForURL(/\/(dashboard|statements\/import)/, { timeout: 15000 })

  // Save storage state
  await context.storageState({ path: 'e2e/.auth/user.json' })
  await browser.close()

  // Seed test data via admin client
  const { data: checking } = await adminClient
    .from('accounts')
    .insert({ user_id: userId, name: 'Test Checking', type: 'checking', balance: 5000, institution: 'Test Bank' })
    .select('id')
    .single()

  const { data: credit } = await adminClient
    .from('accounts')
    .insert({ user_id: userId, name: 'Test Credit', type: 'credit', balance: -850, apr: 18.9, credit_limit: 5000 })
    .select('id')
    .single()

  const checkingId = checking!.id
  const creditId = credit!.id

  // Seed 20 transactions for checking account
  const now = new Date()
  const txns = [
    { date: fmtDate(now, -2), description: 'Paycheck', amount: 2800, category: 'Income', is_income: true, is_transfer: false },
    { date: fmtDate(now, -3), description: 'Whole Foods Market', amount: -127.43, category: 'Food & Groceries', is_income: false, is_transfer: false },
    { date: fmtDate(now, -4), description: 'Netflix', amount: -15.99, category: 'Subscriptions', is_income: false, is_transfer: false },
    { date: fmtDate(now, -5), description: 'Shell Gas Station', amount: -58.22, category: 'Transportation', is_income: false, is_transfer: false },
    { date: fmtDate(now, -6), description: 'Chipotle', amount: -12.75, category: 'Dining Out', is_income: false, is_transfer: false },
    { date: fmtDate(now, -7), description: 'Rent Payment', amount: -1400, category: 'Housing', is_income: false, is_transfer: false },
    { date: fmtDate(now, -8), description: 'Electric Bill', amount: -89.50, category: 'Utilities', is_income: false, is_transfer: false },
    { date: fmtDate(now, -9), description: 'Amazon Purchase', amount: -43.99, category: 'Shopping', is_income: false, is_transfer: false },
    { date: fmtDate(now, -10), description: 'CVS Pharmacy', amount: -32.10, category: 'Health', is_income: false, is_transfer: false },
    { date: fmtDate(now, -11), description: 'Spotify', amount: -9.99, category: 'Subscriptions', is_income: false, is_transfer: false },
    { date: fmtDate(now, -14), description: 'Paycheck', amount: 2800, category: 'Income', is_income: true, is_transfer: false },
    { date: fmtDate(now, -15), description: 'Trader Joes', amount: -85.60, category: 'Food & Groceries', is_income: false, is_transfer: false },
    { date: fmtDate(now, -16), description: 'Uber', amount: -18.50, category: 'Transportation', is_income: false, is_transfer: false },
    { date: fmtDate(now, -17), description: 'Starbucks', amount: -6.75, category: 'Dining Out', is_income: false, is_transfer: false },
    { date: fmtDate(now, -18), description: 'Internet Bill', amount: -79.99, category: 'Utilities', is_income: false, is_transfer: false },
    { date: fmtDate(now, -20), description: 'Movie Theater', amount: -24.00, category: 'Entertainment', is_income: false, is_transfer: false },
    { date: fmtDate(now, -22), description: 'Target', amount: -67.88, category: 'Shopping', is_income: false, is_transfer: false },
    { date: fmtDate(now, -25), description: 'Gym Membership', amount: -35.00, category: 'Health', is_income: false, is_transfer: false },
    { date: fmtDate(now, -28), description: 'Paycheck', amount: 2800, category: 'Income', is_income: true, is_transfer: false },
    { date: fmtDate(now, -30), description: 'Visa Credit Card Payment', amount: -850, category: 'Debt Payments', is_income: false, is_transfer: false },
  ].map((t) => ({ ...t, user_id: userId, account_id: checkingId }))

  await adminClient.from('transactions').insert(txns)

  // Save seed state for tests to reference
  fs.writeFileSync(
    path.join(authDir, 'seed-state.json'),
    JSON.stringify({ userId, checkingId, creditId })
  )

  console.log(`[playwright] Test user ready. Checking: ${checkingId}, Credit: ${creditId}`)
}

function fmtDate(base: Date, offsetDays: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}
