'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'
import type { Account, AccountType } from '@/types/database'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit',
  investment: 'Investment',
}

interface AccountsViewProps {
  accounts: Account[]
}

const EMPTY_FORM = {
  name: '',
  type: 'checking' as AccountType,
  institution: '',
  balance: '',
  apr: '',
  credit_limit: '',
  pay_in_full: false,
  goal_balance: '',
}

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '14px',
  border: '1px solid var(--quill-rule)',
  borderRadius: '4px',
  background: 'var(--quill-cream)',
  color: 'var(--quill-ink)',
  outline: 'none',
} as React.CSSProperties

export default function AccountsView({ accounts: initial }: AccountsViewProps) {
  const [accounts, setAccounts] = useState(initial)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  function handleBlur(field: string) {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      name: form.name,
      type: form.type,
      institution: form.institution || undefined,
      balance: form.type === 'credit' ? -(Math.abs(Number(form.balance))) : Number(form.balance),
      apr: form.apr ? Number(form.apr) : undefined,
      credit_limit: form.credit_limit ? Number(form.credit_limit) : undefined,
      pay_in_full: form.pay_in_full,
      goal_balance: form.goal_balance ? Number(form.goal_balance) : undefined,
    }

    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (res.ok) {
      const newAccount = await res.json()
      setAccounts((prev) => [...prev, newAccount])
      setForm(EMPTY_FORM)
      setTouched({})
      setShowForm(false)
      toast.success('Account added.')
    } else {
      toast.error("Couldn't add the account. Check your connection and try again.")
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setAccounts((prev) => prev.filter((a) => a.id !== id))
      setDeleteId(null)
      toast.success('Account removed.')
    } else {
      toast.error('Failed to remove account. Check your connection and try again.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold tracking-wide" style={{ color: 'var(--quill-ink)' }}>
          Accounts
        </h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm font-medium rounded-sm"
          style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
        >
          + Add account
        </button>
      </div>

      {/* Account list */}
      <div className="space-y-3">
        {accounts.length === 0 && !showForm && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--quill-muted)' }}>
            No accounts yet. Add your checking, savings, and credit accounts.
          </p>
        )}

        {accounts.map((account) => {
          const isCredit = account.type === 'credit'
          const balanceColor = isCredit
            ? account.balance < 0
              ? 'var(--quill-red)'
              : 'var(--quill-green)'
            : account.balance >= 0
            ? 'var(--quill-green)'
            : 'var(--quill-red)'

          return (
            <div
              key={account.id}
              className="border rounded-sm p-5 quill-card-lift"
              style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
            >
              <Link href={`/accounts/${account.id}`} className="block -m-5 p-5 mb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-sm" style={{ color: 'var(--quill-ink)' }}>
                      {account.name}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-sm border font-mono"
                      style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)', background: 'var(--quill-surface)' }}
                    >
                      {TYPE_LABELS[account.type as AccountType]}
                    </span>
                    {account.pay_in_full && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded-sm border"
                        style={{ background: 'var(--quill-surface)', borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
                      >
                        Pay in full
                      </span>
                    )}
                  </div>
                  {account.institution && (
                    <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
                      {account.institution}
                    </p>
                  )}
                  {account.apr && account.apr > 0 && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--quill-amber)' }}>
                      {account.apr}% APR
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xl font-bold font-mono" style={{ color: balanceColor }}>
                    {formatCurrency(account.balance)}
                  </p>
                  {account.credit_limit && (
                    <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
                      of {formatCurrency(account.credit_limit)} limit
                    </p>
                  )}
                  <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
                    View transactions →
                  </p>
                </div>
              </div>
              </Link>

              <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--quill-rule)' }}>
                <button
                  onClick={() => setDeleteId(account.id)}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--quill-red)' }}
                >
                  Remove
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add account dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setForm(EMPTY_FORM); setTouched({}) } }}>
        <DialogContent style={{ background: 'var(--quill-cream)', borderColor: 'var(--quill-rule)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--quill-ink)' }}>Add account</DialogTitle>
            <DialogDescription>
              Enter the details for your new account. You can edit the balance by importing a statement.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            <Field label="Account name" id="field-name">
              <input
                id="field-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                onBlur={() => handleBlur('name')}
                placeholder="USAA Checking"
                style={{
                  ...inputStyle,
                  borderColor: touched.name && !form.name ? 'var(--quill-red)' : 'var(--quill-rule)',
                }}
              />
              {touched.name && !form.name && (
                <p className="text-xs mt-1" style={{ color: 'var(--quill-red)' }}>Required</p>
              )}
            </Field>

            <Field label="Type" id="field-type">
              <select
                id="field-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as AccountType })}
                style={inputStyle}
              >
                <option value="checking">Checking</option>
                <option value="savings">Savings</option>
                <option value="credit">Credit card</option>
                <option value="investment">Investment</option>
              </select>
            </Field>

            <Field label="Institution (optional)" id="field-institution">
              <input
                id="field-institution"
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
                placeholder="USAA"
                style={inputStyle}
              />
            </Field>

            <Field
              label={form.type === 'credit' ? 'Current balance owed' : 'Current balance'}
              id="field-balance"
              hint={form.type === 'credit' ? 'Enter as a positive number — we store it as negative automatically.' : undefined}
            >
              <input
                id="field-balance"
                required
                type="number"
                step="0.01"
                value={form.balance}
                onChange={(e) => setForm({ ...form, balance: e.target.value })}
                onBlur={() => handleBlur('balance')}
                placeholder="0.00"
                style={{
                  ...inputStyle,
                  borderColor: touched.balance && !form.balance ? 'var(--quill-red)' : 'var(--quill-rule)',
                }}
              />
              {touched.balance && !form.balance && (
                <p className="text-xs mt-1" style={{ color: 'var(--quill-red)' }}>Required</p>
              )}
            </Field>

            {form.type === 'credit' && (
              <>
                <Field label="APR (%)" id="field-apr">
                  <input
                    id="field-apr"
                    type="number"
                    step="0.01"
                    value={form.apr}
                    onChange={(e) => setForm({ ...form, apr: e.target.value })}
                    placeholder="18.4"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Credit limit" id="field-credit-limit">
                  <input
                    id="field-credit-limit"
                    type="number"
                    step="0.01"
                    value={form.credit_limit}
                    onChange={(e) => setForm({ ...form, credit_limit: e.target.value })}
                    placeholder="5000"
                    style={inputStyle}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--quill-ink)' }}>
                  <input
                    type="checkbox"
                    checked={form.pay_in_full}
                    onChange={(e) => setForm({ ...form, pay_in_full: e.target.checked })}
                    className="rounded-sm"
                  />
                  I pay this in full each month
                </label>
              </>
            )}

            {(form.type === 'savings' || form.type === 'checking') && (
              <Field label="Goal balance (optional)" id="field-goal-balance">
                <input
                  id="field-goal-balance"
                  type="number"
                  step="0.01"
                  value={form.goal_balance}
                  onChange={(e) => setForm({ ...form, goal_balance: e.target.value })}
                  placeholder="10000"
                  style={inputStyle}
                />
              </Field>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-medium rounded-sm"
                style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Saving…
                  </span>
                ) : 'Add account'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setTouched({}) }}
                className="px-4 py-2.5 text-sm rounded-sm border"
                style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <DialogContent style={{ background: 'var(--quill-cream)', borderColor: 'var(--quill-rule)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--quill-ink)' }}>Remove account?</DialogTitle>
            <DialogDescription>
              This permanently removes the account and all associated transactions. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm mt-2" style={{ color: 'var(--quill-ink)' }}>
            This will permanently remove <strong>{accounts.find((a) => a.id === deleteId)?.name ?? 'this account'}</strong> and all associated transactions. This cannot be undone.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => deleteId && handleDelete(deleteId)}
              className="flex-1 py-2.5 text-sm font-medium rounded-sm"
              style={{ background: 'var(--quill-red)', color: 'var(--quill-cream)' }}
            >
              Remove
            </button>
            <button
              onClick={() => setDeleteId(null)}
              className="flex-1 py-2.5 text-sm rounded-sm border"
              style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
            >
              Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, id, hint, children }: { label: string; id?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-medium mb-1 tracking-wide uppercase" style={{ color: 'var(--quill-muted)' }}>
        {label}
      </label>
      {hint && <p className="text-xs mb-1" style={{ color: 'var(--quill-muted)' }}>{hint}</p>}
      {children}
    </div>
  )
}
