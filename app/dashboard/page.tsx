import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import DashboardView from '@/components/dashboard/DashboardView'
import { subDays, format } from 'date-fns'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const now = new Date()
  // Show last 90 days so users who import older statements don't see an empty dashboard
  const windowStart = format(subDays(now, 90), 'yyyy-MM-dd')
  const windowEnd = format(now, 'yyyy-MM-dd')

  const [
    { data: profile },
    { data: accounts },
    { data: transactions },
    { data: debts },
    { data: goals },
    { data: obligations },
  ] = await Promise.all([
    supabase.from('users').select('id, email, name, subscription_tier, income_biweekly, income_monthly').eq('id', user.id).single(),
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', windowStart)
      .lte('date', windowEnd)
      .order('date', { ascending: false }),
    supabase.from('debts').select('*').eq('user_id', user.id).eq('is_active', true),
    supabase.from('savings_goals').select('*').eq('user_id', user.id).order('priority'),
    supabase.from('fixed_obligations').select('*').eq('user_id', user.id),
  ])

  const txList = transactions ?? []
  const totalIncome = txList
    .filter((t) => t.is_income)
    .reduce((sum, t) => sum + t.amount, 0)
  const totalSpending = txList
    .filter((t) => !t.is_income && !t.is_transfer && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)
  const netPosition = totalIncome - totalSpending

  const spendingByCategory = txList
    .filter((t) => !t.is_income && !t.is_transfer && t.amount < 0)
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + Math.abs(t.amount)
      return acc
    }, {})

  return (
    <AppShell user={profile ? { email: profile.email, name: profile.name } : null}>
      <DashboardView
        accounts={accounts ?? []}
        debts={debts ?? []}
        goals={goals ?? []}
        obligations={obligations ?? []}
        periodLabel="Last 90 days"
        netPosition={netPosition}
        totalIncome={totalIncome}
        totalSpending={totalSpending}
        spendingByCategory={spendingByCategory}
      />
    </AppShell>
  )
}
