'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/format'
import { TRANSACTION_CATEGORIES, type ParsedTransaction } from '@/types/database'
import { toast } from 'sonner'
import Link from 'next/link'

type Step = 'paste' | 'parsing' | 'review' | 'success'

interface AccountOption {
  id: string
  name: string
  type: string
  institution: string | null
}

interface StatementImportViewProps {
  accounts: AccountOption[]
}

const HELP_SEEN_KEY = 'quill_import_help_seen'

export default function StatementImportView({ accounts: initialAccounts }: StatementImportViewProps) {
  const [step, setStep] = useState<Step>('paste')
  const [allAccounts, setAllAccounts] = useState<AccountOption[]>(initialAccounts)
  const [accountId, setAccountId] = useState(initialAccounts[0]?.id ?? '')
  const [text, setText] = useState('')
  const [institution, setInstitution] = useState('')
  const [endingBalance, setEndingBalance] = useState<number | null>(null)
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [commitCount, setCommitCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [committing, setCommitting] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [remainingParses, setRemainingParses] = useState<number | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [statusAnnouncement, setStatusAnnouncement] = useState('')

  // Inline account creation — shown when user has no accounts yet
  const [inlineAccountName, setInlineAccountName] = useState('')
  const [inlineAccountType, setInlineAccountType] = useState<'checking' | 'savings' | 'credit'>('checking')
  const [creatingAccount, setCreatingAccount] = useState(false)

  // Show help by default until user has seen it
  useEffect(() => {
    try {
      const seen = localStorage.getItem(HELP_SEEN_KEY)
      if (!seen) setShowHelp(true)
    } catch {
      // localStorage unavailable (private browsing etc.) — default closed
    }
  }, [])

  function toggleHelp() {
    const next = !showHelp
    setShowHelp(next)
    if (next === false) {
      try { localStorage.setItem(HELP_SEEN_KEY, '1') } catch { /* ignore */ }
    }
  }

  async function createInlineAccount(): Promise<string | null> {
    setCreatingAccount(true)
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: inlineAccountName.trim(),
        type: inlineAccountType,
        balance: 0,
      }),
    })
    setCreatingAccount(false)
    if (!res.ok) {
      setError('Failed to create account. Please try again.')
      return null
    }
    const newAccount: AccountOption = await res.json()
    setAllAccounts([newAccount])
    setAccountId(newAccount.id)
    return newAccount.id
  }

  async function handleParse(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return

    setError(null)

    // If no accounts exist yet, create one inline first
    let resolvedAccountId = accountId
    if (allAccounts.length === 0) {
      if (!inlineAccountName.trim()) {
        setError('Please enter an account name above before parsing.')
        return
      }
      const newId = await createInlineAccount()
      if (!newId) return
      resolvedAccountId = newId
    }

    setStep('parsing')
    setStatusAnnouncement('Step 2 of 3 — Parsing your statement, please wait.')

    const res = await fetch('/api/statements/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, accountId: resolvedAccountId }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (res.status === 429) {
        const resetAt = new Date(Date.now() + 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setError(`5 imports per hour — limit reached. Each import uses AI that costs real money, so this limit keeps OpenQuill free for everyone. Resets around ${resetAt}.`)
      } else {
        setError(data.error ?? "Couldn't extract transactions. Make sure you pasted the full statement text (not a screenshot) from your bank's website or a PDF. Then try again.")
      }
      setStep('paste')
      setStatusAnnouncement('')
      return
    }

    if (data.transactions.length === 0) {
      setError("No transactions found in this text. Make sure you copied the complete statement — it should include a list of transaction dates, descriptions, and amounts.")
      setStep('paste')
      setStatusAnnouncement('')
      return
    }

    if (typeof data.remainingParses === 'number') {
      setRemainingParses(data.remainingParses)
    }
    setInstitution(data.institution)
    setEndingBalance(typeof data.endingBalance === 'number' ? data.endingBalance : null)
    setTransactions(data.transactions)
    setStep('review')
    setStatusAnnouncement(`Step 3 of 3 — ${data.transactions.length} transactions found. Review and confirm.`)
  }

  function updateTransaction(index: number, field: keyof ParsedTransaction, value: unknown) {
    setTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    )
  }

  function removeTransaction(index: number) {
    setTransactions((prev) => prev.filter((_, i) => i !== index))
  }

  const EMPTY_TX: ParsedTransaction = { date: '', description: '', amount: 0, suggestedCategory: 'Other', isIncome: false, isTransfer: false }
  const [adding, setAdding] = useState(false)
  const [newTx, setNewTx] = useState<ParsedTransaction>({ ...EMPTY_TX })

  function addTransaction() {
    if (!newTx.date || !newTx.description) return
    setTransactions((prev) => [...prev, newTx])
    setNewTx({ ...EMPTY_TX })
    setAdding(false)
  }

  async function handleCommit() {
    setCommitting(true)
    setError(null)

    const res = await fetch('/api/statements/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId,
        transactions: transactions.map((t) => ({
          ...t,
          category: t.suggestedCategory,
        })),
        institution,
        ...(endingBalance !== null ? { endingBalance } : {}),
      }),
    })

    const data = await res.json()
    setCommitting(false)

    if (!res.ok) {
      setError(data.error ?? 'Failed to save transactions.')
      return
    }

    setCommitCount(data.count)
    setStep('success')
    setStatusAnnouncement(`Import complete. ${data.count} transactions saved.`)
    toast.success(`Imported ${data.count} transactions.`)
  }

  function reset() {
    setStep('paste')
    setText('')
    setTransactions([])
    setEndingBalance(null)
    setError(null)
    setInstitution('')
    setConfirmReset(false)
    setStatusAnnouncement('')
  }

  // Compute a mini-summary from reviewed transactions for the success screen
  const successSummary = (() => {
    if (transactions.length === 0) return null
    const income = transactions
      .filter((t) => t.isIncome)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const spending = transactions
      .filter((t) => !t.isIncome && t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const byCategory: Record<string, number> = {}
    transactions
      .filter((t) => !t.isIncome && t.amount < 0)
      .forEach((t) => {
        byCategory[t.suggestedCategory] = (byCategory[t.suggestedCategory] ?? 0) + Math.abs(t.amount)
      })
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]
    return { income, spending, topCategory }
  })()

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        {/* Screen reader announcement */}
        <div role="status" aria-live="polite" className="sr-only">{statusAnnouncement}</div>

        <div className="text-3xl mb-3" style={{ color: 'var(--quill-green)' }}>✓</div>
        <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--quill-ink)' }}>
          Import complete
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--quill-muted)' }}>
          {commitCount} transaction{commitCount !== 1 ? 's' : ''} added to your account.
        </p>

        {/* Mini summary */}
        {successSummary && (successSummary.income > 0 || successSummary.spending > 0) && (
          <div
            className="inline-block text-left border rounded-sm px-5 py-4 mb-6 space-y-1.5"
            style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
          >
            {successSummary.income > 0 && (
              <p className="text-sm">
                <span style={{ color: 'var(--quill-muted)' }}>Income found: </span>
                <span className="font-mono font-semibold" style={{ color: 'var(--quill-green)' }}>
                  {formatCurrency(successSummary.income)}
                </span>
              </p>
            )}
            {successSummary.spending > 0 && (
              <p className="text-sm">
                <span style={{ color: 'var(--quill-muted)' }}>Total spending: </span>
                <span className="font-mono font-semibold" style={{ color: 'var(--quill-red)' }}>
                  {formatCurrency(successSummary.spending)}
                </span>
              </p>
            )}
            {successSummary.topCategory && (
              <p className="text-sm">
                <span style={{ color: 'var(--quill-muted)' }}>Top category: </span>
                <span style={{ color: 'var(--quill-ink)' }}>
                  {successSummary.topCategory[0]} ({formatCurrency(successSummary.topCategory[1])})
                </span>
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-5 py-2.5 text-sm font-medium rounded-sm"
            style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
          >
            View dashboard →
          </Link>
          <button
            onClick={reset}
            className="px-5 py-2.5 text-sm rounded-sm border"
            style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
          >
            Import another
          </button>
        </div>

        <p className="text-xs mt-4" style={{ color: 'var(--quill-muted)' }}>
          Set your{' '}
          <a href="/settings" className="underline" style={{ color: 'var(--quill-green)' }}>
            take-home income in Settings →
          </a>{' '}
          to enable accurate affordability calculator results.
        </p>

        {process.env.NEXT_PUBLIC_KOFI_URL && (
          <p className="text-xs mt-4" style={{ color: 'var(--quill-muted)' }}>
            OpenQuill organized {commitCount} transaction{commitCount !== 1 ? 's' : ''}.{' '}
            That import used an AI call that costs real money to process.{' '}
            <a
              href={process.env.NEXT_PUBLIC_KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: 'var(--quill-green)' }}
            >
              Help keep OpenQuill free →
            </a>
          </p>
        )}
      </div>
    )
  }

  if (step === 'parsing') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        {/* Screen reader announcement */}
        <div role="status" aria-live="polite" className="sr-only">{statusAnnouncement}</div>

        <p className="text-xs tracking-widest uppercase mb-6" style={{ color: 'var(--quill-muted)' }}>
          Step 2 of 3
        </p>
        <div className="font-mono text-2xl mb-4 animate-pulse" style={{ color: 'var(--quill-green)' }}>
          ···
        </div>
        <p className="text-sm" style={{ color: 'var(--quill-muted)' }}>Parsing your statement...</p>
        <p className="text-xs mt-2" style={{ color: 'var(--quill-muted)' }}>
          Claude is parsing your transactions. This takes a few seconds. Your statement text is not stored by OpenQuill.
        </p>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Screen reader announcement */}
        <div role="status" aria-live="polite" className="sr-only">{statusAnnouncement}</div>

        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--quill-muted)' }}>
              Step 3 of 3
            </p>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--quill-ink)' }}>
              Review and confirm transactions
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
              {institution} — {transactions.length} transactions found. Edit categories if needed.
            </p>
          </div>
          <div>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--quill-muted)' }}>Discard and start over?</span>
                <button
                  onClick={reset}
                  className="text-xs px-2 py-1 rounded-sm font-medium"
                  style={{ background: 'var(--quill-red)', color: 'var(--quill-cream)' }}
                >
                  Yes, discard
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="text-xs px-2 py-1 rounded-sm border"
                  style={{ color: 'var(--quill-muted)', borderColor: 'var(--quill-rule)' }}
                >
                  Keep reviewing
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-xs px-3 py-2 rounded-sm border"
                style={{ color: 'var(--quill-muted)', borderColor: 'var(--quill-rule)' }}
              >
                ← Start over
              </button>
            )}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-sm text-sm border"
            style={{ background: 'var(--quill-red-bg)', borderColor: 'var(--quill-red)', color: 'var(--quill-red)' }}
          >
            {error}
          </div>
        )}

        {/* Mobile card layout */}
        <div className="sm:hidden border rounded-sm overflow-hidden mb-4" style={{ borderColor: 'var(--quill-rule)' }}>
          <div
            className="flex justify-between text-xs font-medium tracking-wide uppercase px-4 py-2.5"
            style={{ background: 'var(--quill-surface)', color: 'var(--quill-muted)', borderBottom: '1px solid var(--quill-rule)' }}
          >
            <span>Transaction</span>
            <span>Amount</span>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--quill-rule)' }}>
            {transactions.map((t, i) => (
              <div
                key={i}
                className="px-4 py-3 space-y-2"
                style={{ background: 'var(--quill-card)' }}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 space-y-1">
                    <input
                      type="date"
                      value={t.date}
                      onChange={(e) => updateTransaction(i, 'date', e.target.value)}
                      aria-label={`Date for ${t.description}`}
                      className="text-xs font-mono border rounded-sm px-2 py-1"
                      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-muted)' }}
                    />
                    <input
                      type="text"
                      value={t.description}
                      onChange={(e) => updateTransaction(i, 'description', e.target.value)}
                      aria-label="Description"
                      className="w-full text-sm border rounded-sm px-2 py-1"
                      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                    />
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <input
                      type="number"
                      step="0.01"
                      value={t.amount}
                      onChange={(e) => updateTransaction(i, 'amount', parseFloat(e.target.value) || 0)}
                      aria-label={`Amount for ${t.description}`}
                      className="w-24 text-sm font-mono text-right border rounded-sm px-2 py-1"
                      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: t.amount < 0 ? 'var(--quill-red)' : 'var(--quill-green)' }}
                    />
                    <button
                      onClick={() => removeTransaction(i)}
                      aria-label={`Remove "${t.description}"`}
                      className="text-xs px-1.5 py-0.5 rounded-sm transition-opacity hover:opacity-70"
                      style={{ color: 'var(--quill-red)' }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={t.suggestedCategory}
                    onChange={(e) => updateTransaction(i, 'suggestedCategory', e.target.value)}
                    aria-label={`Category for ${t.description}`}
                    className="flex-1 text-xs border rounded-sm px-2 py-1.5"
                    style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                  >
                    {TRANSACTION_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--quill-muted)' }}>
                    <input
                      type="checkbox"
                      checked={t.isIncome}
                      onChange={(e) => updateTransaction(i, 'isIncome', e.target.checked)}
                      aria-label={`Mark "${t.description}" as income`}
                    />
                    Income
                  </label>
                </div>
              </div>
            ))}
          </div>
          {adding && (
            <div className="px-4 py-3 space-y-2" style={{ background: 'var(--quill-surface)', borderTop: '1px solid var(--quill-rule)' }}>
              <div className="space-y-1">
                <input
                  type="date"
                  value={newTx.date}
                  onChange={(e) => setNewTx((p) => ({ ...p, date: e.target.value }))}
                  aria-label="New transaction date"
                  className="text-xs font-mono border rounded-sm px-2 py-1"
                  style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-muted)' }}
                />
                <input
                  type="text"
                  value={newTx.description}
                  onChange={(e) => setNewTx((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Description"
                  aria-label="New transaction description"
                  className="w-full text-sm border rounded-sm px-2 py-1"
                  style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                />
                <input
                  type="number"
                  step="0.01"
                  value={newTx.amount || ''}
                  onChange={(e) => setNewTx((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                  placeholder="Amount (negative for spending)"
                  aria-label="New transaction amount"
                  className="w-full text-sm font-mono border rounded-sm px-2 py-1"
                  style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                />
              </div>
              <div className="flex gap-2 items-center">
                <select
                  value={newTx.suggestedCategory}
                  onChange={(e) => setNewTx((p) => ({ ...p, suggestedCategory: e.target.value as ParsedTransaction['suggestedCategory'] }))}
                  aria-label="New transaction category"
                  className="flex-1 text-xs border rounded-sm px-2 py-1.5"
                  style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                >
                  {TRANSACTION_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1 text-xs" style={{ color: 'var(--quill-muted)' }}>
                  <input
                    type="checkbox"
                    checked={newTx.isIncome}
                    onChange={(e) => setNewTx((p) => ({ ...p, isIncome: e.target.checked }))}
                    aria-label="Mark as income"
                  />
                  Income
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={addTransaction}
                  disabled={!newTx.date || !newTx.description}
                  className="text-xs px-3 py-1.5 rounded-sm font-medium disabled:opacity-50"
                  style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
                >
                  Add
                </button>
                <button
                  onClick={() => { setAdding(false); setNewTx({ ...EMPTY_TX }) }}
                  className="text-xs px-3 py-1.5 rounded-sm"
                  style={{ color: 'var(--quill-muted)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Desktop semantic table */}
        <div className="hidden sm:block border rounded-sm overflow-hidden mb-4" style={{ borderColor: 'var(--quill-rule)' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--quill-surface)', borderBottom: '1px solid var(--quill-rule)' }}>
                <th scope="col" className="text-xs font-medium tracking-wide uppercase px-4 py-2.5 text-left w-32" style={{ color: 'var(--quill-muted)' }}>Date</th>
                <th scope="col" className="text-xs font-medium tracking-wide uppercase px-4 py-2.5 text-left" style={{ color: 'var(--quill-muted)' }}>Description</th>
                <th scope="col" className="text-xs font-medium tracking-wide uppercase px-4 py-2.5 text-right w-28" style={{ color: 'var(--quill-muted)' }}>Amount</th>
                <th scope="col" className="text-xs font-medium tracking-wide uppercase px-4 py-2.5 text-left w-36" style={{ color: 'var(--quill-muted)' }}>Category</th>
                <th scope="col" className="text-xs font-medium tracking-wide uppercase px-4 py-2.5 text-center w-16" style={{ color: 'var(--quill-muted)' }}>Income</th>
                <th scope="col" className="w-10"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr
                  key={i}
                  style={{
                    background: 'var(--quill-card)',
                    borderBottom: i < transactions.length - 1 ? '1px solid var(--quill-rule)' : undefined,
                  }}
                >
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={t.date}
                      onChange={(e) => updateTransaction(i, 'date', e.target.value)}
                      aria-label={`Date for ${t.description}`}
                      className="text-xs font-mono border rounded-sm px-1.5 py-1 w-full"
                      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-muted)' }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={t.description}
                      onChange={(e) => updateTransaction(i, 'description', e.target.value)}
                      aria-label="Description"
                      className="text-sm border rounded-sm px-1.5 py-1 w-full"
                      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={t.amount}
                      onChange={(e) => updateTransaction(i, 'amount', parseFloat(e.target.value) || 0)}
                      aria-label={`Amount for ${t.description}`}
                      className="text-sm font-mono text-right border rounded-sm px-1.5 py-1 w-full"
                      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: t.amount < 0 ? 'var(--quill-red)' : 'var(--quill-green)' }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={t.suggestedCategory}
                      onChange={(e) => updateTransaction(i, 'suggestedCategory', e.target.value)}
                      aria-label={`Category for ${t.description}`}
                      className="text-xs border rounded-sm px-1.5 py-1 w-full"
                      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                    >
                      {TRANSACTION_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={t.isIncome}
                      onChange={(e) => updateTransaction(i, 'isIncome', e.target.checked)}
                      aria-label={`Mark "${t.description}" as income`}
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => removeTransaction(i)}
                      aria-label={`Remove "${t.description}"`}
                      className="text-xs px-1 py-0.5 rounded-sm transition-opacity hover:opacity-70"
                      style={{ color: 'var(--quill-red)' }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {adding && (
                <tr style={{ background: 'var(--quill-surface)', borderTop: '1px solid var(--quill-rule)' }}>
                  <td className="px-4 py-2">
                    <input
                      type="date"
                      value={newTx.date}
                      onChange={(e) => setNewTx((p) => ({ ...p, date: e.target.value }))}
                      aria-label="New transaction date"
                      className="text-xs font-mono border rounded-sm px-1.5 py-1 w-full"
                      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-muted)' }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={newTx.description}
                      onChange={(e) => setNewTx((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Description"
                      aria-label="New transaction description"
                      className="text-sm border rounded-sm px-1.5 py-1 w-full"
                      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={newTx.amount || ''}
                      onChange={(e) => setNewTx((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                      placeholder="0.00"
                      aria-label="New transaction amount"
                      className="text-sm font-mono text-right border rounded-sm px-1.5 py-1 w-full"
                      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={newTx.suggestedCategory}
                      onChange={(e) => setNewTx((p) => ({ ...p, suggestedCategory: e.target.value as ParsedTransaction['suggestedCategory'] }))}
                      aria-label="New transaction category"
                      className="text-xs border rounded-sm px-1.5 py-1 w-full"
                      style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
                    >
                      {TRANSACTION_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={newTx.isIncome}
                      onChange={(e) => setNewTx((p) => ({ ...p, isIncome: e.target.checked }))}
                      aria-label="Mark as income"
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={addTransaction}
                        disabled={!newTx.date || !newTx.description}
                        aria-label="Save new transaction"
                        className="text-sm font-medium px-2 py-1 rounded-sm disabled:opacity-30 transition-opacity hover:opacity-70"
                        style={{ color: 'var(--quill-green)' }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAdding(false); setNewTx({ ...EMPTY_TX }) }}
                        aria-label="Cancel adding transaction"
                        className="text-sm px-2 py-1 rounded-sm transition-opacity hover:opacity-70"
                        style={{ color: 'var(--quill-muted)' }}
                      >
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={handleCommit}
            disabled={committing || transactions.length === 0}
            className="flex-1 sm:flex-none px-6 py-3 text-sm font-medium rounded-sm disabled:opacity-50"
            style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
          >
            {committing ? 'Saving...' : `Confirm & save ${transactions.length} transaction${transactions.length !== 1 ? 's' : ''} →`}
          </button>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="text-sm px-6 py-3 border rounded-sm font-medium transition-opacity hover:opacity-80"
              style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-green)' }}
            >
              + Add a transaction
            </button>
          )}
        </div>
      </div>
    )
  }

  // Step: paste
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Screen reader announcement */}
      <div role="status" aria-live="polite" className="sr-only">{statusAnnouncement}</div>

      <p className="text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--quill-muted)' }}>
        Step 1 of 3
      </p>
      <h1 className="text-lg font-semibold mb-1" style={{ color: 'var(--quill-ink)' }}>
        Import statement
      </h1>
      <p className="text-sm mb-6" style={{ color: 'var(--quill-muted)' }}>
        Copy and paste your bank statement text. Claude will extract and categorize your transactions.
      </p>

      {/* Inline account creation — shown only when user has no accounts yet */}
      {allAccounts.length === 0 && (
        <div
          className="mb-5 p-4 border rounded-sm"
          style={{ background: 'var(--quill-surface)', borderColor: 'var(--quill-rule)' }}
        >
          <p className="text-xs font-medium mb-3 tracking-wide uppercase" style={{ color: 'var(--quill-muted)' }}>
            First, name the account you&apos;re importing
          </p>
          <div className="flex gap-3">
            <input
              id="inline-account-name"
              value={inlineAccountName}
              onChange={(e) => setInlineAccountName(e.target.value)}
              placeholder="e.g. USAA Checking"
              aria-label="Account name"
              className="flex-1 px-3 py-2 text-sm border rounded-sm focus:outline-none"
              style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
            />
            <select
              value={inlineAccountType}
              onChange={(e) => setInlineAccountType(e.target.value as 'checking' | 'savings' | 'credit')}
              aria-label="Account type"
              className="px-3 py-2 text-sm border rounded-sm focus:outline-none"
              style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit">Credit card</option>
            </select>
          </div>
        </div>
      )}

      {/* Account selector — only shown when user has 2+ accounts */}
      {allAccounts.length > 1 && (
        <div className="mb-5">
          <label
            htmlFor="account-select"
            className="block text-xs font-medium mb-1.5 tracking-wide uppercase"
            style={{ color: 'var(--quill-muted)' }}
          >
            Account
          </label>
          <select
            id="account-select"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border rounded-sm focus:outline-none"
            style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-cream)', color: 'var(--quill-ink)' }}
          >
            {allAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} {a.institution ? `(${a.institution})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Single account — show as read-only label */}
      {allAccounts.length === 1 && (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--quill-muted)' }}>Importing to:</span>
          <span className="text-xs font-medium" style={{ color: 'var(--quill-ink)' }}>{allAccounts[0].name}</span>
          <Link href="/accounts" className="text-xs underline" style={{ color: 'var(--quill-muted)' }}>
            change
          </Link>
        </div>
      )}

      <form onSubmit={handleParse} className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="statement-text"
              className="block text-xs font-medium tracking-wide uppercase"
              style={{ color: 'var(--quill-muted)' }}
            >
              Statement text
            </label>
            <button
              type="button"
              onClick={toggleHelp}
              className="text-xs underline"
              style={{ color: 'var(--quill-muted)' }}
            >
              {showHelp ? 'Hide help' : 'How to copy'}
            </button>
          </div>

          {showHelp && (
            <div
              className="mb-2 p-3 rounded-sm text-xs space-y-1.5 border"
              style={{ background: 'var(--quill-surface)', borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
            >
              <p><strong style={{ color: 'var(--quill-ink)' }}>Mobile:</strong> Open your bank&apos;s PDF statement, tap &ldquo;Select All&rdquo;, copy, then paste here.</p>
              <p><strong style={{ color: 'var(--quill-ink)' }}>Android:</strong> Open your bank app &rarr; Statements &rarr; tap the statement &rarr; Share or Print to PDF &rarr; open in Chrome &rarr; select all text (Ctrl+A or long-press &rarr; Select All) &rarr; copy &rarr; paste here.</p>
              <p><strong style={{ color: 'var(--quill-ink)' }}>Desktop (Mac):</strong> Open the PDF in Preview or a browser, press Cmd+A to select all, copy, then paste here.</p>
              <p><strong style={{ color: 'var(--quill-ink)' }}>Desktop (Windows):</strong> Open the PDF in Chrome or Edge, press Ctrl+A to select all, copy, then paste here.</p>
            </div>
          )}

          <textarea
            id="statement-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            rows={12}
            placeholder="Paste your bank statement text here..."
            className="w-full px-3 py-2.5 text-sm border rounded-sm focus:outline-none resize-none font-mono"
            style={{
              borderColor: 'var(--quill-rule)',
              background: 'var(--quill-cream)',
              color: 'var(--quill-ink)',
              lineHeight: '1.5',
            }}
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--quill-muted)' }}>
            Your statement text is sent to Anthropic&apos;s Claude API for parsing, then deleted immediately.
            We never store your statement text or ask for bank credentials.{' '}
            <Link href="/privacy" className="underline" style={{ color: 'var(--quill-muted)' }}>
              Privacy policy →
            </Link>
          </p>
        </div>

        {error && (
          <div>
            <p role="alert" className="text-sm" style={{ color: 'var(--quill-red)' }}>
              {error}
            </p>
            {error.includes('imports per hour') && process.env.NEXT_PUBLIC_KOFI_URL && (
              <a
                href={process.env.NEXT_PUBLIC_KOFI_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-xs underline"
                style={{ color: 'var(--quill-green)' }}
              >
                Help keep OpenQuill free — support on Ko-fi →
              </a>
            )}
          </div>
        )}

        {remainingParses !== null && remainingParses <= 2 && remainingParses > 0 && !error && (
          <p className="text-xs" style={{ color: 'var(--quill-amber)' }}>
            {remainingParses} import{remainingParses !== 1 ? 's' : ''} left this hour. Resets automatically.
          </p>
        )}

        <button
          type="submit"
          disabled={!text.trim() || (allAccounts.length === 0 && !inlineAccountName.trim()) || creatingAccount}
          className="w-full py-3 text-sm font-medium rounded-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
        >
          {creatingAccount ? 'Setting up account...' : 'Parse statement →'}
        </button>
      </form>
    </div>
  )
}
