import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import AccountDetailView from '@/components/accounts/AccountDetailView'

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: account }, { data: transactions }] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, name')
      .eq('id', user.id)
      .single(),
    supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single(),
    supabase
      .from('transactions')
      .select('*')
      .eq('account_id', id)
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1000),
  ])

  if (!account) notFound()

  return (
    <AppShell user={profile ? { email: profile.email, name: profile.name } : null}>
      <AccountDetailView account={account} transactions={transactions ?? []} />
    </AppShell>
  )
}
