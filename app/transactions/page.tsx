import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import TransactionListView from '@/components/transactions/TransactionListView'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: transactions }, { data: accounts }] = await Promise.all([
    supabase.from('users').select('id, email, name, subscription_tier, income_biweekly, income_monthly').eq('id', user.id).single(),
    supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1000),
    supabase.from('accounts').select('id, name').eq('user_id', user.id),
  ])

  return (
    <AppShell user={profile ? { email: profile.email, name: profile.name } : null}>
      <TransactionListView
        transactions={transactions ?? []}
        accounts={accounts ?? []}
      />
    </AppShell>
  )
}
