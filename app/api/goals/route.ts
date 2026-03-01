import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkCsrf } from '@/lib/csrf'

const GoalSchema = z.object({
  name: z.string().min(1).max(100),
  goal_amount: z.number().min(1),
  current_amount: z.number().min(0).default(0),
  account_id: z.string().uuid().optional(),
  target_date: z.string().optional(),
  priority: z.number().int().min(1).default(1),
})

const UpdateGoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  goal_amount: z.number().min(1).optional(),
  account_id: z.string().uuid().nullable().optional(),
  target_date: z.string().nullable().optional(),
  priority: z.number().int().min(1).optional(),
  current_amount: z.number().min(0).optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', user.id)
    .order('priority')

  if (error) {
    console.error('[api/goals] GET error:', error)
    return NextResponse.json({ error: 'Failed to load savings goals.' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const csrfCheck = checkCsrf(request)
  if (csrfCheck) return csrfCheck

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = GoalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.account_id) {
    const { data: acct, error: acctError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', parsed.data.account_id)
      .eq('user_id', user.id)
      .single()

    if (acctError || !acct) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }
  }

  const { data, error } = await supabase
    .from('savings_goals')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) {
    console.error('[api/goals] POST error:', error)
    return NextResponse.json({ error: 'Failed to create savings goal.' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const csrfCheck = checkCsrf(request)
  if (csrfCheck) return csrfCheck

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateGoalSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const { id, account_id, ...updates } = parsed.data

  // S1-1: If account_id is being set (non-null), verify the account belongs to this user
  if (account_id !== undefined && account_id !== null) {
    const { data: acct, error: acctError } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', account_id)
      .eq('user_id', user.id)
      .single()

    if (acctError || !acct) {
      return NextResponse.json(
        { error: 'Account not found or not owned by user' },
        { status: 403 }
      )
    }
  }

  const updatePayload: Record<string, unknown> = {
    ...updates,
  }
  if (account_id !== undefined) {
    updatePayload.account_id = account_id
  }

  const { data, error } = await supabase
    .from('savings_goals')
    .update(updatePayload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[api/goals] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update savings goal.' }, { status: 500 })
  }
  return NextResponse.json(data)
}
