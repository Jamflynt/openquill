import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkCsrf } from '@/lib/csrf'

const AccountSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['checking', 'savings', 'credit', 'investment']),
  institution: z.string().max(100).optional(),
  balance: z.number(),
  apr: z.number().min(0).max(100).optional(),
  credit_limit: z.number().min(0).optional(),
  pay_in_full: z.boolean().optional(),
  goal_balance: z.number().min(0).optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('type')

  if (error) {
    console.error('[api/accounts] GET error:', error)
    return NextResponse.json({ error: 'Failed to load accounts.' }, { status: 500 })
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

  const parsed = AccountSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('accounts')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) {
    console.error('[api/accounts] POST error:', error)
    return NextResponse.json({ error: 'Failed to create account.' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
