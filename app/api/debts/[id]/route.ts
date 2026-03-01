import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkCsrf } from '@/lib/csrf'

const UpdateSchema = z.object({
  name: z.string().min(1).optional(),
  balance: z.number().min(0).optional(),
  apr: z.number().min(0).max(100, 'APR must be 100% or less — enter as a percentage, e.g. 18.4').optional(),
  min_payment: z.number().min(0).optional(),
  due_date: z.string().optional(),
  pay_in_full: z.boolean().optional(),
  ends_in_months: z.number().int().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfCheck = checkCsrf(request)
  if (csrfCheck) return csrfCheck

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 })

  const { data, error } = await supabase
    .from('debts')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[api/debts/[id]] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update debt.' }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfCheck = checkCsrf(request)
  if (csrfCheck) return csrfCheck

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { error } = await supabase
    .from('debts')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('[api/debts/[id]] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to remove debt.' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
