import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export default async function globalTeardown() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const seedPath = path.join(__dirname, '.auth', 'seed-state.json')
  if (!fs.existsSync(seedPath)) return

  const { userId } = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))

  // Delete user profile data (cascades to accounts, transactions, etc.)
  await adminClient.from('users').delete().eq('id', userId)
  // Delete auth user
  await adminClient.auth.admin.deleteUser(userId)

  // Clean up auth files
  fs.rmSync(path.join(__dirname, '.auth'), { recursive: true, force: true })
  console.log('[playwright] Test user cleaned up.')
}
