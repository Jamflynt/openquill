import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import SavingsGoalsView from '@/components/goals/SavingsGoalsView'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: goals }, { data: accounts }] = await Promise.all([
    supabase.from('users').select('id, email, name, subscription_tier, income_biweekly, income_monthly').eq('id', user.id).single(),
    supabase.from('savings_goals').select('*').eq('user_id', user.id).order('priority'),
    supabase.from('accounts').select('id, name, type, balance').eq('user_id', user.id),
  ])

  return (
    <AppShell user={profile ? { email: profile.email, name: profile.name } : null}>
      <SavingsGoalsView goals={goals ?? []} accounts={accounts ?? []} />
    </AppShell>
  )
}
