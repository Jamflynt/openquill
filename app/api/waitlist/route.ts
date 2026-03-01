import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const FEATURES = [
  'Unlimited statement imports',
  'CSV export',
  'AI monthly insights',
] as const

const WaitlistSchema = z.object({
  email: z.string().email('Invalid email address').max(254),
  feature: z.enum(FEATURES).optional(),
})

// S2-1: In-memory IP rate limiting — 10 signups per IP per 60 minutes.
// Resets on cold start (serverless), but is better than no protection.
const ipRateMap = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_MAX = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ipRateMap.get(ip)

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRateMap.set(ip, { count: 1, windowStart: now })
    return false
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true
  }

  entry.count += 1
  return false
}

// POST /api/waitlist — join the waitlist (no auth required)
export async function POST(request: NextRequest) {
  // S2-1: IP rate limiting
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = WaitlistSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('pro_waitlist')
    .upsert(
      { email: parsed.data.email.toLowerCase(), feature: parsed.data.feature ?? null },
      { onConflict: 'email', ignoreDuplicates: false }
    )

  if (error) {
    console.error('[waitlist] insert error:', error.message)
    return NextResponse.json({ error: 'Failed to join waitlist. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// GET /api/waitlist/count — returns the public waitlist count (no auth required)
export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_waitlist_count')

  if (error) {
    console.error('[waitlist] count error:', error.message)
    return NextResponse.json({ count: 0 })
  }

  return NextResponse.json({ count: Number(data ?? 0) })
}
