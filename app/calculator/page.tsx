import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import AffordabilityCalculator from '@/components/calculator/AffordabilityCalculator'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export default async function CalculatorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

  const [
    { data: profile },
    { data: accounts },
    { data: debts },
    { data: obligations },
    { data: transactions },
  ] = await Promise.all([
    supabase.from('users').select('id, email, name, subscription_tier, income_biweekly, income_monthly').eq('id', user.id).single(),
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('debts').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('fixed_obligations').select('*').eq('user_id', user.id),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', monthStart)
      .lte('date', monthEnd),
  ])

  return (
    <AppShell user={profile ? { email: profile.email, name: profile.name } : null}>
      <AffordabilityCalculator
        accounts={accounts ?? []}
        debts={debts ?? []}
        obligations={obligations ?? []}
        transactions={transactions ?? []}
        incomeBiweekly={profile?.income_biweekly ?? null}
        incomeMonthly={profile?.income_monthly ?? null}
      />
    </AppShell>
  )
}
