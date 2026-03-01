import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkCsrf } from '@/lib/csrf'

const UpdateSchema = z.object({
  category: z.string().optional(),
  user_notes: z.string().max(500).optional(),
  is_income: z.boolean().optional(),
  is_transfer: z.boolean().optional(),
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
    .from('transactions')
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('[api/transactions/[id]] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update transaction.' }, { status: 500 })
  }
  return NextResponse.json(data)
}
