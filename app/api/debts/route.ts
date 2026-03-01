import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkCsrf } from '@/lib/csrf'

const DebtSchema = z.object({
  name: z.string().min(1).max(100),
  balance: z.number().min(0),
  apr: z.number().min(0).max(100, 'APR must be 100% or less — enter as a percentage, e.g. 18.4'),
  min_payment: z.number().min(0),
  due_date: z.string().optional(),
  pay_in_full: z.boolean().default(false),
  ends_in_months: z.number().int().min(0).optional(),
})

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('apr', { ascending: false })

  if (error) {
    console.error('[api/debts] GET error:', error)
    return NextResponse.json({ error: 'Failed to load debts.' }, { status: 500 })
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

  const parsed = DebtSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data', details: parsed.error.flatten() }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('debts')
    .insert({ ...parsed.data, user_id: user.id, is_active: true })
    .select()
    .single()

  if (error) {
    console.error('[api/debts] POST error:', error)
    return NextResponse.json({ error: 'Failed to create debt.' }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
