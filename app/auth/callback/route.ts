import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const ALLOWED_REDIRECTS = new Set([
  '/dashboard',
  '/statements/import',
  '/accounts',
  '/debts',
  '/settings',
  '/transactions',
])

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next') ?? ''
  const explicitNext = ALLOWED_REDIRECTS.has(rawNext) ? rawNext : null

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (explicitNext) {
        return NextResponse.redirect(`${origin}${explicitNext}`)
      }
      // Route based on whether user has any transactions.
      // New users (no transactions) go straight to import — the moment of value.
      // Returning users go to dashboard.
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .limit(1)

      const destination = (count ?? 0) > 0 ? '/dashboard' : '/statements/import'
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  // Auth failure — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
