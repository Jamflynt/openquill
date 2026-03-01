import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import AccountsView from '@/components/accounts/AccountsView'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: accounts }] = await Promise.all([
    supabase.from('users').select('id, email, name, subscription_tier, income_biweekly, income_monthly').eq('id', user.id).single(),
    supabase.from('accounts').select('*').eq('user_id', user.id).order('type'),
  ])

  return (
    <AppShell user={profile ? { email: profile.email, name: profile.name } : null}>
      <AccountsView accounts={accounts ?? []} />
    </AppShell>
  )
}
