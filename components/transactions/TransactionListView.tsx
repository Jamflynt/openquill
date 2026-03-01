'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'
import { TRANSACTION_CATEGORIES, type Transaction, type Account } from '@/types/database'
import { toast } from 'sonner'

interface TransactionListViewProps {
  transactions: Transaction[]
  accounts: Pick<Account, 'id' | 'name'>[]
}

const ALL = '__all__'

export default function TransactionListView({
  transactions: initial,
  accounts,
}: TransactionListViewProps) {
  const [transactions, setTransactions] = useState(initial)
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState(ALL)
  const [categoryFilter, setCategoryFilter] = useState(ALL)
  const [editing, setEditing] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit(t: Transaction) {
    setEditing(t.id)
    setEditCategory(t.category)
    setEditNotes(t.user_notes ?? '')
  }

  function cancelEdit() {
    setEditing(null)
    setEditCategory('')
    setEditNotes('')
  }

  async function saveEdit(id: string) {
    setSaving(true)
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: editCategory, user_notes: editNotes || null }),
    })
    setSaving(false)

    if (res.ok) {
      setTransactions((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, category: editCategory, user_notes: editNotes || null } : t
        )
      )
      setEditing(null)
      toast.success('Transaction updated.')
    } else {
      toast.error("Couldn't save that change. Check your connection and try again, or refresh the page.")
    }
  }

  const filtered = transactions.filter((t) => {
    if (accountFilter !== ALL && t.account_id !== accountFilter) return false
    if (categoryFilter !== ALL && t.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (
        !t.description.toLowerCase().includes(q) &&
        !(t.merchant ?? '').toLowerCase().includes(q)
      )
        return false
    }
    return true
  })

  // Group by month
  type MonthGroup = { month: string; rows: Transaction[] }
  const grouped = filtered.reduce<MonthGroup[]>((acc, t) => {
    const month = t.date.slice(0, 7) // YYYY-MM
    const existing = acc.find((g) => g.month === month)
    if (existing) {
      existing.rows.push(t)
    } else {
      acc.push({ month, rows: [t] })
    }
    return acc
  }, [])

  function formatMonth(yyyyMm: string) {
    const [y, m] = yyyyMm.split('-')
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold" style={{ color: 'var(--quill-ink)' }}>
          Transactions
        </h1>
        <span className="text-xs font-mono" style={{ color: 'var(--quill-muted)' }}>
          {filtered.length} of {transactions.length}
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions..."
          aria-label="Search transactions"
          className="flex-1 px-3 py-2 text-sm border rounded-sm focus:outline-none"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
        />
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          aria-label="Filter by account"
          className="px-3 py-2 text-sm border rounded-sm focus:outline-none"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
        >
          <option value={ALL}>All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className="px-3 py-2 text-sm border rounded-sm focus:outline-none"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
        >
          <option value={ALL}>All categories</option>
          {TRANSACTION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-center py-12" style={{ color: 'var(--quill-muted)' }}>
          {transactions.length === 0 ? (
            <>
              No transactions yet.{' '}
              <Link href="/statements/import" className="underline" style={{ color: 'var(--quill-green)' }}>
                Import a bank statement to get started →
              </Link>
            </>
          ) : (
            'No transactions match your filters.'
          )}
        </p>
      )}

      {/* Grouped rows */}
      <div className="space-y-6">
        {grouped.map(({ month, rows }) => {
          const monthTotal = rows
            .filter((t) => !t.is_income && !t.is_transfer)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)

          return (
            <section key={month}>
              {/* Month header */}
              <div
                className="flex items-center justify-between px-2 pb-2 mb-1"
                style={{ borderBottom: '1px solid var(--quill-rule)' }}
              >
                <h3
                  className="text-xs font-medium tracking-wide uppercase"
                  style={{ color: 'var(--quill-muted)' }}
                >
                  {formatMonth(month)}
                </h3>
                <span className="text-xs font-mono" style={{ color: 'var(--quill-muted)' }}>
                  {formatCurrency(monthTotal)} in spending
                </span>
              </div>

              {/* Transaction rows */}
              <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--quill-rule)' }}>
                {rows.map((t, i) => {
                  const acct = accounts.find((a) => a.id === t.account_id)
                  const isEditing = editing === t.id

                  return (
                    <div
                      key={t.id}
                      style={{
                        background: i % 2 === 0 ? 'var(--quill-card)' : 'var(--quill-cream)',
                        borderBottom: i < rows.length - 1 ? '1px solid var(--quill-rule)' : undefined,
                      }}
                    >
                      {/* Main row */}
                      <button
                        type="button"
                        className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left"
                        aria-expanded={isEditing}
                        aria-controls={`edit-panel-${t.id}`}
                        aria-label={`${t.description} — ${t.date} — ${formatCurrency(t.amount)}. Click to ${isEditing ? 'close' : 'edit'}.`}
                        onClick={() => (isEditing ? cancelEdit() : startEdit(t))}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" style={{ color: 'var(--quill-ink)' }}>
                            {t.description}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
                            {t.date} · {t.category}
                            {acct ? ` · ${acct.name}` : ''}
                          </p>
                          {t.user_notes && (
                            <p className="text-xs mt-0.5 italic" style={{ color: 'var(--quill-muted)' }}>
                              {t.user_notes}
                            </p>
                          )}
                        </div>
                        <span
                          className="font-mono font-medium text-sm shrink-0"
                          style={{ color: t.amount < 0 ? 'var(--quill-red)' : 'var(--quill-green)' }}
                        >
                          {formatCurrency(t.amount)}
                        </span>
                      </button>

                      {/* Edit panel */}
                      {isEditing && (
                        <div
                          id={`edit-panel-${t.id}`}
                          className="px-4 pb-4 pt-1 space-y-3"
                          style={{ borderTop: '1px solid var(--quill-rule)', background: 'var(--quill-surface)' }}
                        >
                          <div>
                            <label
                              htmlFor={`cat-${t.id}`}
                              className="block text-xs font-medium mb-1 tracking-wide uppercase"
                              style={{ color: 'var(--quill-muted)' }}
                            >
                              Category
                            </label>
                            <select
                              id={`cat-${t.id}`}
                              value={editCategory}
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="w-full text-sm border rounded-sm px-2 py-1.5"
                              style={{
                                borderColor: 'var(--quill-rule)',
                                background: 'var(--quill-cream)',
                                color: 'var(--quill-ink)',
                              }}
                            >
                              {TRANSACTION_CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label
                              htmlFor={`notes-${t.id}`}
                              className="block text-xs font-medium mb-1 tracking-wide uppercase"
                              style={{ color: 'var(--quill-muted)' }}
                            >
                              Notes
                            </label>
                            <input
                              id={`notes-${t.id}`}
                              type="text"
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                              placeholder="Optional"
                              className="w-full text-sm border rounded-sm px-2 py-1.5"
                              style={{
                                borderColor: 'var(--quill-rule)',
                                background: 'var(--quill-cream)',
                                color: 'var(--quill-ink)',
                              }}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(t.id)}
                              disabled={saving}
                              aria-busy={saving}
                              className="px-4 py-1.5 text-xs font-medium rounded-sm"
                              style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="px-4 py-1.5 text-xs rounded-sm border"
                              style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
