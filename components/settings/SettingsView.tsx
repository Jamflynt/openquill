'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { User } from '@/types/database'

type SettingsViewProps = {
  profile: Pick<User, 'id' | 'email' | 'name' | 'subscription_tier' | 'income_biweekly' | 'income_monthly'>
}

export default function SettingsView({ profile }: SettingsViewProps) {
  const router = useRouter()
  const [name, setName] = useState(profile.name ?? '')
  const [incomeBiweekly, setIncomeBiweekly] = useState(
    profile.income_biweekly != null ? String(profile.income_biweekly) : ''
  )
  const [incomeMonthly, setIncomeMonthly] = useState(
    profile.income_monthly != null ? String(profile.income_monthly) : ''
  )
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload: Record<string, unknown> = { name: name.trim() || null }

    if (incomeBiweekly !== '') {
      payload.income_biweekly = parseFloat(incomeBiweekly)
    } else {
      payload.income_biweekly = null
    }

    if (incomeMonthly !== '') {
      payload.income_monthly = parseFloat(incomeMonthly)
    } else {
      payload.income_monthly = null
    }

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)

    if (res.ok) {
      toast.success('Settings saved.')
      router.refresh()
    } else {
      toast.error('Could not save settings. Check your connection and try again.')
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const res = await fetch('/api/profile', { method: 'DELETE' })
    if (res.ok) {
      router.push('/login')
    } else {
      toast.error('Failed to delete account. Try again.')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-lg font-semibold mb-6" style={{ color: 'var(--quill-ink)' }}>
        Settings
      </h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile */}
        <section>
          <h2
            className="text-xs font-medium tracking-widest uppercase mb-4"
            style={{ color: 'var(--quill-muted)', borderBottom: '1px solid var(--quill-rule)', paddingBottom: '8px' }}
          >
            Profile
          </h2>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="settings-name"
                className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
                style={{ color: 'var(--quill-muted)' }}
              >
                Display name
              </label>
              <input
                id="settings-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
                className="w-full px-3 py-2.5 text-sm border rounded-sm focus:outline-none"
                style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1 tracking-wide uppercase" style={{ color: 'var(--quill-muted)' }}>
                Email
              </label>
              <p className="text-sm" style={{ color: 'var(--quill-ink)' }}>{profile.email}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
                To change your email, delete your account and sign in with the new address.
              </p>
            </div>
          </div>
        </section>

        {/* Income */}
        <section>
          <h2
            className="text-xs font-medium tracking-widest uppercase mb-1"
            style={{ color: 'var(--quill-muted)', borderBottom: '1px solid var(--quill-rule)', paddingBottom: '8px' }}
          >
            Income
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--quill-muted)' }}>
            Your take-home (after-tax) income is used by the affordability calculator. Enter the amount deposited into your account after taxes. Fill in monthly <em>or</em> biweekly — not both.
          </p>

          {incomeBiweekly !== '' && incomeMonthly !== '' && (
            <p role="alert" className="text-xs mb-3 px-3 py-2 rounded-sm border" style={{ color: 'var(--quill-amber)', borderColor: 'var(--quill-amber)', background: 'var(--quill-amber-bg)' }}>
              Both fields are filled — monthly will be used and biweekly will be ignored. Clear one to avoid confusion.
            </p>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="settings-income-biweekly"
                className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
                style={{ color: 'var(--quill-muted)' }}
              >
                Take-home pay (biweekly)
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono"
                  style={{ color: 'var(--quill-muted)' }}
                >
                  $
                </span>
                <input
                  id="settings-income-biweekly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={incomeBiweekly}
                  onChange={(e) => setIncomeBiweekly(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2.5 text-sm border rounded-sm focus:outline-none font-mono"
                  style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="settings-income-monthly"
                className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
                style={{ color: 'var(--quill-muted)' }}
              >
                Take-home pay (monthly)
              </label>
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-mono"
                  style={{ color: 'var(--quill-muted)' }}
                >
                  $
                </span>
                <input
                  id="settings-income-monthly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={incomeMonthly}
                  onChange={(e) => setIncomeMonthly(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2.5 text-sm border rounded-sm focus:outline-none font-mono"
                  style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Account */}
        <section>
          <h2
            className="text-xs font-medium tracking-widest uppercase mb-4"
            style={{ color: 'var(--quill-muted)', borderBottom: '1px solid var(--quill-rule)', paddingBottom: '8px' }}
          >
            Account
          </h2>
          <div>
            <p className="text-sm" style={{ color: 'var(--quill-ink)' }}>
              Free — all features included
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
              5 statement imports per hour (fair-use limit).
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--quill-muted)' }}>
              Dashboard, debt tracker, goals, calculator, and transaction history — always free and unlimited.
            </p>
          </div>
        </section>

        {/* Support OpenQuill */}
        {process.env.NEXT_PUBLIC_KOFI_URL && (
          <section>
            <h2
              className="text-xs font-medium tracking-widest uppercase mb-4"
              style={{ color: 'var(--quill-muted)', borderBottom: '1px solid var(--quill-rule)', paddingBottom: '8px' }}
            >
              Support OpenQuill
            </h2>
            <p className="text-xs mb-3" style={{ color: 'var(--quill-muted)' }}>
              I build OpenQuill solo. Every statement import runs an AI call that costs real money. If it&apos;s been useful, a Ko-fi helps keep it free for everyone.
            </p>
            <a
              href={process.env.NEXT_PUBLIC_KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-sm border transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--quill-green)', color: 'var(--quill-green)' }}
            >
              Support development on Ko-fi →
            </a>
          </section>
        )}

        {/* Questions */}
        <section>
          <h2
            className="text-xs font-medium tracking-widest uppercase mb-3"
            style={{ color: 'var(--quill-muted)', borderBottom: '1px solid var(--quill-rule)', paddingBottom: '8px' }}
          >
            Questions
          </h2>
          <a
            href="https://github.com/Jamflynt/openquill/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline"
            style={{ color: 'var(--quill-green)' }}
          >
            Questions or feedback? Open a GitHub issue →
          </a>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 text-sm font-medium rounded-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
        >
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </form>

      {/* Danger zone */}
      <section className="mt-12">
        <h2
          className="text-xs font-medium tracking-widest uppercase mb-4"
          style={{ color: 'var(--quill-red)', borderBottom: '1px solid var(--quill-rule)', paddingBottom: '8px' }}
        >
          Danger zone
        </h2>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-sm px-4 py-2.5 rounded-sm border"
            style={{ color: 'var(--quill-red)', borderColor: 'var(--quill-red)' }}
          >
            Delete account and all data
          </button>
        ) : (
          <div
            className="p-4 border rounded-sm"
            style={{ borderColor: 'var(--quill-red)', background: 'var(--quill-red-bg)' }}
          >
            <p className="text-sm mb-4" style={{ color: 'var(--quill-ink)' }}>
              This permanently deletes your account and all data. Supabase backups rotate within 30 days. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium rounded-sm"
                style={{ background: 'var(--quill-red)', color: 'var(--quill-cream)' }}
              >
                {deleting ? 'Deleting...' : 'Yes, delete everything'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm rounded-sm border"
                style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
