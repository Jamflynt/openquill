import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import DebtTrackerView from '@/components/debts/DebtTrackerView'

export default async function DebtsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: debts }] = await Promise.all([
    supabase.from('users').select('id, email, name, subscription_tier, income_biweekly, income_monthly').eq('id', user.id).single(),
    supabase.from('debts').select('*').eq('user_id', user.id).eq('is_active', true).order('apr', { ascending: false }),
  ])

  return (
    <AppShell user={profile ? { email: profile.email, name: profile.name } : null}>
      <DebtTrackerView debts={debts ?? []} />
    </AppShell>
  )
}
