import { NextRequest, NextResponse } from 'next/server'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Verifies the Origin header for state-changing requests to prevent CSRF.
 * Supabase cookies are SameSite=Lax so real risk is low, but this adds
 * an explicit layer of protection.
 *
 * Returns null if the request is safe to proceed.
 * Returns a 403 NextResponse if the origin check fails.
 */
export function checkCsrf(request: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(request.method)) return null

  const origin = request.headers.get('origin')

  // No origin header = same-origin browser or server-to-server — allow
  if (!origin) return null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const host = request.headers.get('host')
  const expectedOrigin = appUrl ?? (host ? `https://${host}` : null)

  const isDev = process.env.NODE_ENV === 'development'
  const devOrigin = host ? `http://${host}` : null

  if (expectedOrigin && origin !== expectedOrigin) {
    if (!isDev || origin !== devOrigin) {
      console.warn(`[csrf] blocked request from origin: ${origin}, expected: ${expectedOrigin}`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  return null
}
