'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ui/ThemeToggle'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? ''

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const callbackUrl = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
      },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div
      className="w-full max-w-sm border rounded-sm p-8"
      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
    >
      {sent ? (
        <div className="text-center">
          <div className="text-2xl mb-3" style={{ color: 'var(--quill-green)' }}>
            ✓
          </div>
          <p className="text-sm font-medium mb-2" style={{ color: 'var(--quill-ink)' }}>
            Check your email
          </p>
          <p className="text-sm" style={{ color: 'var(--quill-muted)' }}>
            Check your inbox and click the link we just sent to <strong>{email}</strong>. No password needed.
          </p>
          <p className="text-xs mt-3" style={{ color: 'var(--quill-muted)' }}>
            Don&apos;t see it? Check your spam or junk folder.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-4" style={{ color: 'var(--quill-ink)' }}>
              Sign in with your email
            </p>
            <label
              htmlFor="email"
              className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
              style={{ color: 'var(--quill-muted)' }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 text-sm border rounded-sm focus:outline-none transition-shadow"
              style={{
                borderColor: 'var(--quill-rule)',
                background: 'var(--quill-cream)',
                color: 'var(--quill-ink)',
              }}
            />
          </div>

          {error && (
            <p role="alert" className="text-xs" style={{ color: 'var(--quill-red)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-3 text-sm font-medium rounded-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
            style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
          >
            {loading ? 'Sending...' : 'Send magic link →'}
          </button>

          <p className="text-xs text-center" style={{ color: 'var(--quill-muted)' }}>
            No account needed. We&apos;ll create one on first sign-in.
          </p>
        </form>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 relative"
      style={{ background: 'var(--quill-cream)' }}
    >
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      {/* Wordmark */}
      <div className="mb-10 text-center">
        <h1
          className="quill-wordmark text-4xl mb-2"
          style={{ color: 'var(--quill-green)' }}
        >
          OPENQUILL
        </h1>
        <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--quill-muted)' }}>
          Import your bank statement. No passwords required.
        </p>
      </div>

      <Suspense fallback={
        <div
          className="w-full max-w-sm border rounded-sm p-8"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
        />
      }>
        <LoginForm />
      </Suspense>
    </main>
  )
}
