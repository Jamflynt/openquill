import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { checkCsrf } from '@/lib/csrf'

const UpdateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  income_biweekly: z.number().min(0).nullable().optional(),
  income_monthly: z.number().min(0).nullable().optional(),
})

export async function PATCH(request: NextRequest) {
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

  const parsed = UpdateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const updates = parsed.data

  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', user.id)
    .select('id, email, name, income_biweekly, income_monthly, subscription_tier')
    .single()

  if (error) {
    console.error('[profile] update error:', error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest) {
  const csrfCheck = checkCsrf(request)
  if (csrfCheck) return csrfCheck

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // S1-2: Delete data FIRST, then sign out.
  // If deletion fails, user remains authenticated and can retry.
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', user.id)

  // Note: auth.users record persists. User can re-register with the same email.

  if (error) {
    console.error('[profile] delete error:', error.message)
    return NextResponse.json({ error: 'Failed to delete account. Please try again.' }, { status: 500 })
  }

  // Sign out AFTER successful deletion — session no longer needed
  await supabase.auth.signOut()

  return NextResponse.json({ deleted: true })
}
