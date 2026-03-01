'use client'

import { useState } from 'react'
import Link from 'next/link'
import ThemeToggle from '@/components/ui/ThemeToggle'

const FEATURES = [
  'Unlimited statement imports',
  'CSV export',
  'AI monthly insights',
] as const

type Feature = typeof FEATURES[number]

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [feature, setFeature] = useState<Feature | ''>('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [waitlistCount, setWaitlistCount] = useState<number | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const res = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), feature: feature || undefined }),
    })

    setSubmitting(false)

    if (res.ok) {
      setSuccess(true)
      fetch('/api/waitlist')
        .then((r) => r.json())
        .then((d) => { if (typeof d.count === 'number') setWaitlistCount(d.count) })
        .catch(() => {})
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative" style={{ background: 'var(--quill-cream)' }}>
      <div className="absolute top-3 right-3">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        {/* Header */}
        <Link
          href="/"
          className="block mb-8 text-center text-2xl font-bold tracking-[0.3em] font-mono"
          style={{ color: 'var(--quill-green)' }}
        >
          OPENQUILL
        </Link>

        <h1 className="text-xl font-semibold mb-2 text-center" style={{ color: 'var(--quill-ink)' }}>
          Join the Pro waitlist
        </h1>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--quill-muted)' }}>
          Pro is coming soon. I&apos;ll send one email when it&apos;s ready. Waitlist members get a launch discount.
        </p>

        {/* What's in Pro */}
        <div
          className="mb-8 border rounded-sm overflow-hidden text-sm"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
        >
          <p
            className="text-xs font-medium tracking-wide uppercase px-4 pt-3 pb-2"
            style={{ color: 'var(--quill-muted)' }}
          >
            What&apos;s in Pro ($4.99/mo)
          </p>
          {[
            'Unlimited imports — no hourly cap, import as many statements as you want',
            'CSV export — download all your transactions to use in any spreadsheet',
            'AI monthly insights — plain-English summary of your spending trends each month',
            'Main features never paywalled — dashboard, spending analysis, debt tracker, goals, calculator, transaction history',
          ].map((item, i) => (
            <div
              key={i}
              className="px-4 py-2.5 flex items-start gap-2.5"
              style={{ borderTop: '1px solid var(--quill-rule)' }}
            >
              <span className="font-mono text-xs mt-0.5 shrink-0" style={{ color: 'var(--quill-green)' }}>→</span>
              <span style={{ color: 'var(--quill-ink)' }}>{item}</span>
            </div>
          ))}
        </div>

        {success ? (
          <div
            className="p-5 border rounded-sm text-center"
            style={{ borderColor: 'var(--quill-green)', background: 'var(--quill-card)' }}
          >
            <p className="text-2xl mb-2" style={{ color: 'var(--quill-green)' }}>✓</p>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--quill-ink)' }}>
              You&apos;re on the list.
            </p>
            <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
              I&apos;ll email {email} when Pro launches — with a discount for waiting.
            </p>
            {waitlistCount !== null && (
              <p className="text-xs mt-1" style={{ color: 'var(--quill-muted)' }}>
                You&apos;re one of {waitlistCount.toLocaleString()} people on the list.
              </p>
            )}
            <Link
              href="/dashboard"
              className="inline-block mt-4 text-xs underline"
              style={{ color: 'var(--quill-green)' }}
            >
              Back to dashboard →
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
                style={{ color: 'var(--quill-muted)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-3 py-2.5 text-sm border rounded-sm focus:outline-none"
                style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
              />
            </div>

            <div>
              <label
                className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
                style={{ color: 'var(--quill-muted)' }}
              >
                Which feature do you most want?
              </label>
              <select
                value={feature}
                onChange={(e) => setFeature(e.target.value as Feature | '')}
                className="w-full px-3 py-2.5 text-sm border rounded-sm focus:outline-none"
                style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
              >
                <option value="">— Select one (optional)</option>
                {FEATURES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-sm" style={{ color: 'var(--quill-red)' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="w-full py-3 text-sm font-medium rounded-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
            >
              {submitting ? 'Joining...' : 'Join the waitlist →'}
            </button>

            <p className="text-xs text-center" style={{ color: 'var(--quill-muted)' }}>
              One email when it launches. No drip campaigns, no spam.
            </p>
          </form>
        )}

        <p className="text-xs text-center mt-8" style={{ color: 'var(--quill-muted)' }}>
          <Link href="/" className="underline" style={{ color: 'var(--quill-muted)' }}>
            ← Back to OpenQuill
          </Link>
        </p>
      </div>
    </main>
  )
}
