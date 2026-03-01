import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import StatementImportView from '@/components/statements/StatementImportView'

export default async function StatementImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: accounts }] = await Promise.all([
    supabase.from('users').select('id, email, name, subscription_tier, income_biweekly, income_monthly').eq('id', user.id).single(),
    supabase.from('accounts').select('id, name, type, institution').eq('user_id', user.id).order('type'),
  ])

  return (
    <AppShell user={profile ? { email: profile.email, name: profile.name } : null}>
      <StatementImportView accounts={accounts ?? []} />
    </AppShell>
  )
}
