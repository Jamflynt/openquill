import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { endOfMonth, parseISO, format } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  const month = searchParams.get('month') // YYYY-MM

  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .limit(500)

  if (accountId) query = query.eq('account_id', accountId)
  if (month) {
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM.' }, { status: 400 })
    }
    const monthStart = `${month}-01`
    const monthEnd = format(endOfMonth(parseISO(monthStart)), 'yyyy-MM-dd')
    query = query.gte('date', monthStart).lte('date', monthEnd)
  }

  const { data, error } = await query
  if (error) {
    console.error('[api/transactions] GET error:', error)
    return NextResponse.json({ error: 'Failed to load transactions.' }, { status: 500 })
  }
  return NextResponse.json(data)
}
