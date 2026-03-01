'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate, formatMonth } from '@/lib/format'
import { TRANSACTION_CATEGORIES, type Account, type Transaction, type AccountType } from '@/types/database'
import { toast } from 'sonner'

const TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit: 'Credit',
  investment: 'Investment',
}

const CATEGORY_COLORS: Record<string, string> = {
  'Housing': 'var(--quill-green)',
  'Food & Groceries': '#4A6E5A',
  'Dining Out': 'var(--quill-amber)',
  'Transportation': '#6B4F30',
  'Subscriptions': '#7A5C8A',
  'Shopping': '#4A7A8A',
  'Utilities': '#6B7A4A',
  'Health': '#8A4A4A',
  'Entertainment': '#8A6A4A',
  'Debt Payments': 'var(--quill-red)',
  'Savings / Transfers': '#4A8A6A',
  'Income': 'var(--quill-green)',
  'Other': 'var(--quill-muted)',
}

interface Props {
  account: Account
  transactions: Transaction[]
}

export default function AccountDetailView({ account, transactions: initial }: Props) {
  const [transactions, setTransactions] = useState(initial)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('__all__')
  const [editing, setEditing] = useState<string | null>(null)
  const [editCategory, setEditCategory] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Summary stats ────────────────────────────────────────────────────────
  const spending = transactions
    .filter((t) => !t.is_income && !t.is_transfer && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  const income = transactions
    .filter((t) => t.is_income && t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const net = income - spending

  // ── Category breakdown (spending only) ──────────────────────────────────
  const categoryTotals: Record<string, number> = {}
  transactions
    .filter((t) => !t.is_income && !t.is_transfer && t.amount < 0)
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + Math.abs(t.amount)
    })

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  const maxCategoryAmount = topCategories[0]?.[1] ?? 1

  // ── Filtered + grouped transactions ─────────────────────────────────────
  const filtered = transactions.filter((t) => {
    if (categoryFilter !== '__all__' && t.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!t.description.toLowerCase().includes(q)) return false
    }
    return true
  })

  type MonthGroup = { month: string; rows: Transaction[] }
  const grouped = filtered.reduce<MonthGroup[]>((acc, t) => {
    const month = t.date.slice(0, 7)
    const existing = acc.find((g) => g.month === month)
    if (existing) existing.rows.push(t)
    else acc.push({ month, rows: [t] })
    return acc
  }, [])

  // ── Edit handlers ────────────────────────────────────────────────────────
  function startEdit(t: Transaction) {
    setEditing(t.id)
    setEditCategory(t.category)
    setEditNotes(t.user_notes ?? '')
  }

  function cancelEdit() {
    setEditing(null)
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
      toast.error('Failed to update.')
    }
  }

  const isCredit = account.type === 'credit'
  const balanceColor = isCredit
    ? account.balance < 0 ? 'var(--quill-red)' : 'var(--quill-green)'
    : account.balance >= 0 ? 'var(--quill-green)' : 'var(--quill-red)'

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">

      {/* ── Back link ──────────────────────────────────────────────────── */}
      <Link
        href="/accounts"
        className="inline-flex items-center gap-1 text-xs mb-5 hover:underline"
        style={{ color: 'var(--quill-muted)' }}
      >
        ← Accounts
      </Link>

      {/* ── Account header ─────────────────────────────────────────────── */}
      <div
        className="border rounded-sm p-5 mb-6"
        style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-lg font-semibold" style={{ color: 'var(--quill-ink)' }}>
                {account.name}
              </h1>
              <span
                className="text-xs px-1.5 py-0.5 rounded-sm border font-mono"
                style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)', background: 'var(--quill-surface)' }}
              >
                {TYPE_LABELS[account.type as AccountType]}
              </span>
              {account.pay_in_full && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-sm border"
                  style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)', background: 'var(--quill-surface)' }}
                >
                  Pay in full
                </span>
              )}
            </div>
            {account.institution && (
              <p className="text-sm" style={{ color: 'var(--quill-muted)' }}>{account.institution}</p>
            )}
            {account.apr && account.apr > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--quill-amber)' }}>
                {account.apr}% APR
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold font-mono" style={{ color: balanceColor }}>
              {formatCurrency(account.balance)}
            </p>
            {account.credit_limit && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
                of {formatCurrency(account.credit_limit)} limit
              </p>
            )}
          </div>
        </div>
      </div>

      {transactions.length > 0 && (
        <>
          {/* ── Summary stats ────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Total spending', value: formatCurrency(spending), color: 'var(--quill-red)' },
              { label: 'Total income', value: formatCurrency(income), color: 'var(--quill-green)' },
              { label: 'Net', value: formatCurrency(net, true), color: net >= 0 ? 'var(--quill-green)' : 'var(--quill-red)' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="border rounded-sm p-3 text-center"
                style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
              >
                <p className="text-xs tracking-wide mb-1" style={{ color: 'var(--quill-muted)' }}>
                  {stat.label}
                </p>
                <p className="text-sm font-semibold font-mono" style={{ color: stat.color }}>
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* ── Category breakdown ───────────────────────────────────────── */}
          {topCategories.length > 0 && (
            <div
              className="border rounded-sm p-4 mb-6"
              style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
            >
              <p
                className="text-xs font-medium tracking-wide uppercase mb-3"
                style={{ color: 'var(--quill-muted)' }}
              >
                Spending by category
              </p>
              <div className="space-y-2.5">
                {topCategories.map(([cat, amount]) => (
                  <div key={cat}>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-xs" style={{ color: 'var(--quill-ink)' }}>{cat}</span>
                      <span className="text-xs font-mono" style={{ color: 'var(--quill-ink)' }}>
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <div
                      aria-hidden="true"
                      className="w-full overflow-hidden rounded-full"
                      style={{ height: '4px', background: 'var(--quill-rule)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(amount / maxCategoryAmount) * 100}%`,
                          background: CATEGORY_COLORS[cat] ?? 'var(--quill-muted)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      {transactions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 mb-5">
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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="px-3 py-2 text-sm border rounded-sm focus:outline-none"
            style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
          >
            <option value="__all__">All categories</option>
            {TRANSACTION_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <span className="self-center text-xs font-mono shrink-0" style={{ color: 'var(--quill-muted)' }}>
            {filtered.length} of {transactions.length}
          </span>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {transactions.length === 0 && (
        <p className="text-sm text-center py-12" style={{ color: 'var(--quill-muted)' }}>
          No transactions yet for this account.{' '}
          <Link href="/statements/import" className="underline" style={{ color: 'var(--quill-green)' }}>
            Import a statement →
          </Link>
        </p>
      )}

      {filtered.length === 0 && transactions.length > 0 && (
        <p className="text-sm text-center py-8" style={{ color: 'var(--quill-muted)' }}>
          No transactions match your filters.
        </p>
      )}

      {/* ── Transaction list ─────────────────────────────────────────────── */}
      <div className="space-y-6">
        {grouped.map(({ month, rows }) => {
          const monthSpend = rows
            .filter((t) => !t.is_income && !t.is_transfer)
            .reduce((sum, t) => sum + Math.abs(t.amount), 0)

          return (
            <section key={month}>
              <div
                className="flex items-center justify-between px-2 pb-2 mb-1"
                style={{ borderBottom: '1px solid var(--quill-rule)' }}
              >
                <h3 className="text-xs font-medium tracking-wide uppercase" style={{ color: 'var(--quill-muted)' }}>
                  {formatMonth(month + '-01')}
                </h3>
                <span className="text-xs font-mono" style={{ color: 'var(--quill-muted)' }}>
                  {formatCurrency(monthSpend)} spending
                </span>
              </div>

              <div className="border rounded-sm overflow-hidden" style={{ borderColor: 'var(--quill-rule)' }}>
                {rows.map((t, i) => {
                  const isEditing = editing === t.id
                  return (
                    <div
                      key={t.id}
                      style={{
                        background: i % 2 === 0 ? 'var(--quill-card)' : 'var(--quill-cream)',
                        borderBottom: i < rows.length - 1 ? '1px solid var(--quill-rule)' : undefined,
                      }}
                    >
                      <button
                        type="button"
                        className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left"
                        aria-expanded={isEditing}
                        aria-controls={`edit-panel-${t.id}`}
                        aria-label={`${t.description} — ${formatDate(t.date)} — ${formatCurrency(t.amount)}. Click to ${isEditing ? 'close' : 'edit'}.`}
                        onClick={() => (isEditing ? cancelEdit() : startEdit(t))}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate" style={{ color: 'var(--quill-ink)' }}>
                            {t.description}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
                            {formatDate(t.date)} · {t.category}
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
                              style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                            >
                              {TRANSACTION_CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
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
                              style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
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
