import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkCsrf } from '@/lib/csrf'

const ParsedTransactionSchema = z.object({
  date: z.string(),
  description: z.string().max(255),
  amount: z.number(),
  suggestedCategory: z.string().max(100),
  isIncome: z.boolean(),
  isTransfer: z.boolean(),
  // User may override category in review
  category: z.string().max(100).optional(),
})

const CommitRequestSchema = z.object({
  accountId: z.string().uuid(),
  transactions: z.array(ParsedTransactionSchema).min(1).max(500),
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD').optional(),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD').optional(),
  beginningBalance: z.number().max(100_000_000).optional(),
  endingBalance: z.number().max(100_000_000).optional(),
  institution: z.string().max(100).optional(),
})

type ParsedTx = z.infer<typeof ParsedTransactionSchema>

// Infer year from the majority of fully-dated transactions in the batch.
// Prevents historical statements imported without periodStart from being
// assigned the current year.
function inferYear(transactions: ParsedTx[]): number {
  const years = transactions
    .map((t) => t.date)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .map((d) => parseInt(d.slice(0, 4)))
  if (years.length === 0) return new Date().getFullYear()
  const counts = years.reduce<Record<number, number>>((acc, y) => {
    acc[y] = (acc[y] ?? 0) + 1
    return acc
  }, {})
  return parseInt(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0])
}

function normalizeDate(dateStr: string, statementYear: number): string {
  // Already a full date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr

  // MM/DD format — infer year
  if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
    const [month, day] = dateStr.split('/')
    return `${statementYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  return dateStr
}

export async function POST(request: NextRequest) {
  const csrfCheck = checkCsrf(request)
  if (csrfCheck) return csrfCheck

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CommitRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { accountId, transactions, periodStart, periodEnd, beginningBalance, endingBalance } =
    parsed.data

  // Fetch user profile for subscription tier
  const { data: profile } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  // Rate limit: max 20 commits per hour (matches parse limit with buffer)
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: commitCount } = await supabase
    .from('statements')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', windowStart)

  const limit = profile?.subscription_tier === 'pro' ? Infinity : 10
  if ((commitCount ?? 0) >= limit) {
    return NextResponse.json(
      { error: 'You have reached the statement import limit for this hour. Try again later.' },
      { status: 429 }
    )
  }

  // Verify account belongs to user
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Insert statement record first — transactions FK-reference it, so it must exist first.
  // Rollback: if transactions fail after statement insert, delete the statement row.
  const { data: statement, error: statementError } = await supabase
    .from('statements')
    .insert({
      user_id: user.id,
      account_id: accountId,
      period_start: periodStart ?? null,
      period_end: periodEnd ?? null,
      beginning_balance: beginningBalance ?? null,
      ending_balance: endingBalance ?? null,
      parsed_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (statementError || !statement) {
    console.error('[commit] statement insert error:', statementError)
    return NextResponse.json({ error: 'Failed to create statement record' }, { status: 500 })
  }

  const statementId = statement.id

  // Normalize and build transaction rows
  const statementYear = periodStart
    ? new Date(periodStart).getFullYear()
    : inferYear(transactions)

  let transactionRows: object[]
  try {
    transactionRows = transactions.map((t) => {
      const dateStr = normalizeDate(t.date, statementYear)
      const dateObj = new Date(dateStr)
      if (isNaN(dateObj.getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        throw new Error(`Invalid date: ${t.date}`)
      }
      return {
        statement_id: statementId,
        user_id: user.id,
        account_id: accountId,
        date: dateStr,
        description: t.description,
        amount: t.amount,
        category: t.category || t.suggestedCategory || 'Other',
        is_income: t.isIncome,
        is_transfer: t.isTransfer,
      }
    })
  } catch {
    const { error: rollbackError } = await supabase.from('statements').delete().eq('id', statementId)
    if (rollbackError) {
      console.error('[commit] rollback failed after date error — orphaned statement:', statementId, rollbackError)
    }
    return NextResponse.json(
      { error: 'One or more transactions has an invalid date format.' },
      { status: 400 }
    )
  }

  // Insert transactions — statement record already exists so FK is satisfied
  const { error: insertError } = await supabase
    .from('transactions')
    .insert(transactionRows)

  if (insertError) {
    console.error('[commit] transaction insert error:', insertError)
    const { error: rollbackError } = await supabase.from('statements').delete().eq('id', statementId)
    if (rollbackError) {
      console.error('[commit] rollback failed after insert error — orphaned statement:', statementId, rollbackError)
    }
    return NextResponse.json(
      { error: 'Failed to save transactions.' },
      { status: 500 }
    )
  }

  // Update account balance from statement's ending balance (if provided), plus timestamp.
  // This is a secondary cache update — transactions are already committed above.
  // A failure here is logged and flagged in the response, but does not roll back.
  const accountUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof endingBalance === 'number') {
    accountUpdate.balance = endingBalance
  }
  const { error: balanceError } = await supabase
    .from('accounts')
    .update(accountUpdate)
    .eq('id', accountId)
    .eq('user_id', user.id)
  if (balanceError) {
    console.error('[commit] account balance update error:', balanceError)
  }

  return NextResponse.json({
    success: true,
    statementId: statement.id,
    count: transactionRows.length,
    ...(balanceError ? { balanceUpdateFailed: true } : {}),
  })
}
