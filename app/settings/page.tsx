import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import SettingsView from '@/components/settings/SettingsView'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, email, name, subscription_tier, income_biweekly, income_monthly')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <AppShell user={{ email: profile.email, name: profile.name }}>
      <SettingsView profile={profile} />
    </AppShell>
  )
}
