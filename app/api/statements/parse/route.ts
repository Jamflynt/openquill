import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { parseStatementWithClaude } from '@/lib/parsing/claude-parser'
import { checkCsrf } from '@/lib/csrf'

const ParseRequestSchema = z.object({
  text: z.string().min(10, 'Statement text too short').max(50000, 'Statement text too long'),
  accountId: z.string().uuid('Invalid account ID'),
})

const FREE_TIER_LIMIT = 5
const WINDOW_HOURS = 1

async function getRateLimitStatus(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  isPro: boolean
): Promise<{ allowed: boolean; usedCount: number }> {
  if (isPro) return { allowed: true, usedCount: 0 }

  const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString()

  // Count parse API calls in the last hour using the parse_events table.
  // Each call to this route inserts a row before the Claude call, so the
  // counter increments regardless of whether the user commits the result.
  const { count, error } = await supabase
    .from('parse_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', windowStart)

  if (error) {
    // Fail open — don't block the user if we can't count
    console.error('[rate-limit] count error:', error.message)
    return { allowed: true, usedCount: 0 }
  }

  const usedCount = count ?? 0
  return { allowed: usedCount < FREE_TIER_LIMIT, usedCount }
}

export async function POST(request: NextRequest) {
  const csrfCheck = checkCsrf(request)
  if (csrfCheck) return csrfCheck

  const supabase = await createClient()

  // Authenticate — never skip this
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Validate input
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = ParseRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { text, accountId } = parsed.data

  // Verify the account belongs to this user
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('id, user_id')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single()

  if (accountError || !account) {
    return NextResponse.json({ error: 'Account not found' }, { status: 404 })
  }

  // Get subscription tier for rate limiting
  const { data: userProfile } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const isPro = userProfile?.subscription_tier === 'pro'

  // Check rate limit (Supabase-backed — works on serverless)
  const { allowed, usedCount } = await getRateLimitStatus(supabase, user.id, isPro)
  if (!allowed) {
    return NextResponse.json(
      {
        error: `You've used all ${FREE_TIER_LIMIT} free imports this hour. Pro (coming soon) removes this limit.`,
        upgradeUrl: '/waitlist',
      },
      { status: 429 }
    )
  }

  // Record this parse attempt before calling Claude so the rate limit counter
  // increments even if the user never commits the result.
  const { error: parseEventError } = await supabase.from('parse_events').insert({ user_id: user.id })
  if (parseEventError) {
    // Log but continue — a failed insert means this parse won't count against the rate limit.
    // This is the safer failure mode: user isn't blocked unfairly.
    console.error('[parse] parse_events insert failed:', parseEventError.message)
  }

  // Parse with Claude
  const result = await parseStatementWithClaude(text)

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // usedCount was before this parse; after inserting, usedCount+1 have been used
  const remainingParses = isPro ? null : FREE_TIER_LIMIT - (usedCount + 1)

  return NextResponse.json({
    transactions: result.transactions,
    institution: result.institution,
    endingBalance: result.endingBalance,
    count: result.transactions.length,
    remainingParses,
  })
}
