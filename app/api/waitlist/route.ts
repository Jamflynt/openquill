import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/waitlist — DEPRECATED: Pro waitlist is no longer active.
// The table and data remain for historical reference.
export async function POST() {
  return NextResponse.json(
    { error: 'The waitlist is no longer active. OpenQuill is free for everyone.' },
    { status: 410 }
  )
}

// GET /api/waitlist — returns the historical waitlist count (no auth required)
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_waitlist_count')

  if (error) {
    console.error('[waitlist] count error:', error.message)
    return NextResponse.json({ count: 0 })
  }

  return NextResponse.json({ count: Number(data ?? 0) })
}
