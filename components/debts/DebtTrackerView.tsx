'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { formatCurrency, calcPayoffMonths, calcTotalInterest, generateAmortizationSchedule } from '@/lib/format'
import type { Debt } from '@/types/database'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface DebtTrackerViewProps {
  debts: Debt[]
}

const EMPTY_FORM = {
  name: '',
  balance: '',
  apr: '',
  min_payment: '',
  due_date: '',
  pay_in_full: false,
  ends_in_months: '',
}

function isCarryingBalance(debt: Debt): boolean {
  if (!debt.pay_in_full || debt.balance <= 0) return false
  // If no due date, we can't tell — show warning to be safe
  if (!debt.due_date) return true
  // Parse due date like "03/16" (month/day). If today is past the due date
  // in the current month, the statement is overdue.
  const [month, day] = debt.due_date.split('/').map(Number)
  if (!month || !day) return true
  const now = new Date()
  const dueDate = new Date(now.getFullYear(), month - 1, day)
  return now > dueDate
}

export default function DebtTrackerView({ debts: initial }: DebtTrackerViewProps) {
  const prefersReducedMotion = useReducedMotion()
  const [debts, setDebts] = useState(initial)
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [celebratingDebt, setCelebratingDebt] = useState<Debt | null>(null)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null)
  const [reversed, setReversed] = useState(false)

  const kofiUrl = process.env.NEXT_PUBLIC_KOFI_URL

  const sorted = (() => {
    const s = strategy === 'avalanche'
      ? [...debts].sort((a, b) => b.apr - a.apr)
      : [...debts].sort((a, b) => a.balance - b.balance)
    return reversed ? s.reverse() : s
  })()

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0)
  const totalMin = debts.reduce((s, d) => s + d.min_payment, 0)

  function handleBlur(field: string) {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFieldErrors({})

    const payload = {
      name: form.name,
      balance: Number(form.balance),
      apr: form.apr ? Number(form.apr) : 0,
      min_payment: Number(form.min_payment),
      due_date: form.due_date || undefined,
      pay_in_full: form.pay_in_full,
      ends_in_months: form.ends_in_months ? Number(form.ends_in_months) : undefined,
    }

    const res = await fetch('/api/debts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)
    if (res.ok) {
      const newDebt = await res.json()
      setDebts((prev) => [...prev, newDebt])
      setForm(EMPTY_FORM)
      setTouched({})
      setFieldErrors({})
      setShowForm(false)
      toast.success('Debt added.')
    } else {
      try {
        const body = await res.json()
        if (body.details?.fieldErrors) {
          const errors: Record<string, string> = {}
          for (const [field, messages] of Object.entries(body.details.fieldErrors)) {
            errors[field] = (messages as string[])[0]
          }
          setFieldErrors(errors)
        } else {
          toast.error('Could not save. Check your connection and try again.')
        }
      } catch {
        toast.error('Could not save. Check your connection and try again.')
      }
    }
  }

  async function confirmMarkPaidOff(id: string) {
    const debt = debts.find((d) => d.id === id) ?? null
    const res = await fetch(`/api/debts/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setDebts((prev) => prev.filter((d) => d.id !== id))
      setConfirmDelete(null)
      if (debt) setCelebratingDebt(debt)
    } else {
      toast.error('Could not save. Check your connection and try again.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: 'var(--quill-ink)' }}>Debt tracker</h1>
          {debts.length > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
              <span className="font-mono" style={{ color: 'var(--quill-red)' }}>
                {formatCurrency(totalDebt)}
              </span>{' '}
              total · {formatCurrency(totalMin)}/mo minimums
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* Explicit strategy toggle — two buttons */}
          <div
            className="flex rounded-sm overflow-hidden border text-xs"
            style={{ borderColor: 'var(--quill-rule)' }}
            role="group"
            aria-label="Payoff strategy"
          >
            <button
              onClick={() => setStrategy('avalanche')}
              aria-pressed={strategy === 'avalanche'}
              title="Avalanche: pay highest-APR debt first — saves the most money"
              className="px-3 py-1.5"
              style={{
                background: strategy === 'avalanche' ? 'var(--quill-green)' : 'transparent',
                color: strategy === 'avalanche' ? 'var(--quill-cream)' : 'var(--quill-muted)',
              }}
            >
              Avalanche
            </button>
            <button
              onClick={() => setStrategy('snowball')}
              aria-pressed={strategy === 'snowball'}
              title="Snowball: pay smallest balance first — builds momentum"
              className="px-3 py-1.5"
              style={{
                borderLeft: '1px solid var(--quill-rule)',
                background: strategy === 'snowball' ? 'var(--quill-green)' : 'transparent',
                color: strategy === 'snowball' ? 'var(--quill-cream)' : 'var(--quill-muted)',
              }}
            >
              Snowball
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReversed((r) => !r)}
              className="text-xs px-2 py-1 rounded-sm transition-colors hover:opacity-70"
              style={{ color: 'var(--quill-muted)' }}
            >
              {reversed ? '↑ Default order' : '↓ Reverse'}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="text-xs px-3 py-1.5 rounded-sm"
              style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
            >
              + Add debt
            </button>
          </div>
        </div>
      </div>

      {/* Debt payoff celebration */}
      <AnimatePresence>
        {celebratingDebt && (
          <motion.div
            className="border p-5 mb-4"
            style={{ borderColor: 'var(--quill-green)', background: 'var(--quill-green-bg)' }}
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--quill-green)' }}>
                  <motion.svg
                    width="20" height="20" viewBox="0 0 20 20" fill="none"
                    style={{ display: 'inline-block', marginRight: '8px', verticalAlign: 'middle' }}
                    aria-hidden="true"
                  >
                    <motion.circle
                      cx="10" cy="10" r="9"
                      stroke="var(--quill-green)"
                      strokeWidth="1.5"
                      initial={prefersReducedMotion ? {} : { pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                    <motion.path
                      d="M6 10.5l2.5 2.5L14 8"
                      stroke="var(--quill-green)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      initial={prefersReducedMotion ? {} : { pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.3, delay: 0.3, ease: 'easeOut' }}
                    />
                  </motion.svg>
                  {celebratingDebt.name} paid off.
                </p>
                <p className="text-sm" style={{ color: 'var(--quill-ink)' }}>
                  You cleared a{' '}
                  <span className="font-mono font-semibold">{formatCurrency(celebratingDebt.balance)}</span>{' '}
                  balance.
                </p>
                {kofiUrl && (
                  <p className="text-xs mt-3" style={{ color: 'var(--quill-muted)' }}>
                    OpenQuill helped you track it down. If it&apos;s been useful,{' '}
                    <a
                      href={kofiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                      style={{ color: 'var(--quill-green)' }}
                    >
                      support development on Ko-fi →
                    </a>
                  </p>
                )}
              </div>
              <button
                onClick={() => setCelebratingDebt(null)}
                className="text-xs shrink-0"
                style={{ color: 'var(--quill-muted)' }}
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Strategy explanation */}
      <p className="text-xs mb-4" style={{ color: 'var(--quill-muted)' }}>
        {strategy === 'avalanche'
          ? 'Avalanche: sorted highest APR first — minimizes total interest paid.'
          : 'Snowball: sorted smallest balance first — builds momentum with quick wins.'}
      </p>

      {/* Debt cards */}
      <div className="space-y-3">
        {sorted.length === 0 && !showForm && (
          <p className="text-sm text-center py-8" style={{ color: 'var(--quill-muted)' }}>
            Track debts without sharing with third-party aggregators. See payoff timelines and total interest — just for you.
          </p>
        )}

        {sorted.map((debt) => {
          const payoffMonths = calcPayoffMonths(debt.balance, debt.apr, debt.min_payment)
          const totalInterest = calcTotalInterest(debt.balance, debt.apr, debt.min_payment)
          const carryingBalance = isCarryingBalance(debt)
          const isConfirming = confirmDelete === debt.id
          const isExpanded = expandedDebtId === debt.id

          return (
            <div
              key={debt.id}
              className="border rounded-sm p-5 quill-card-lift cursor-pointer"
              style={{
                borderColor: carryingBalance ? 'var(--quill-red)' : isExpanded ? 'var(--quill-green)' : 'var(--quill-rule)',
                background: 'var(--quill-card)',
              }}
              onClick={() => debt.balance > 0 && setExpandedDebtId(isExpanded ? null : debt.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && debt.balance > 0) {
                  e.preventDefault()
                  setExpandedDebtId(isExpanded ? null : debt.id)
                }
              }}
              aria-expanded={isExpanded}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-medium text-sm" style={{ color: 'var(--quill-ink)' }}>{debt.name}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {debt.apr > 0 && (
                      <span className="text-xs font-mono" style={{ color: 'var(--quill-amber)' }}>
                        {debt.apr}% APR
                      </span>
                    )}
                    {debt.due_date && (
                      <span className="text-xs" style={{ color: 'var(--quill-muted)' }}>
                        Due {debt.due_date}
                      </span>
                    )}
                    {debt.ends_in_months && (
                      <span className="text-xs" style={{ color: 'var(--quill-muted)' }}>
                        ~{debt.ends_in_months} mo remaining
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-2xl font-bold font-mono" style={{ color: 'var(--quill-red)' }}>
                    {formatCurrency(debt.balance)}
                  </p>
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    aria-hidden="true"
                    style={{
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      color: 'var(--quill-muted)',
                    }}
                  >
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Carrying balance warning */}
              {carryingBalance && (
                <div
                  className="text-xs px-3 py-2 rounded-sm mb-3"
                  style={{ background: 'var(--quill-amber-bg)', color: 'var(--quill-amber)' }}
                >
                  Carrying a balance — interest accruing at {debt.apr}% APR
                </div>
              )}

              {/* Payoff projection */}
              {debt.apr > 0 && isFinite(payoffMonths) && (
                <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
                  At minimums only: paid off in ~{payoffMonths} months, total interest{' '}
                  <span style={{ color: 'var(--quill-red)' }}>{formatCurrency(totalInterest)}</span>
                </p>
              )}
              {debt.apr > 0 && !isFinite(payoffMonths) && (
                <p className="text-xs" style={{ color: 'var(--quill-red)' }}>
                  Minimum payment doesn&apos;t cover interest — balance will grow.
                </p>
              )}

              {/* Expanded detail */}
              <AnimatePresence>
                {isExpanded && (
                  <DebtCardDetail debt={debt} prefersReducedMotion={prefersReducedMotion} />
                )}
              </AnimatePresence>

              <div
                className="flex gap-3 mt-3 pt-3"
                style={{ borderTop: '1px solid var(--quill-rule)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-xs" style={{ color: 'var(--quill-muted)' }}>
                  Min: <span className="font-mono">{formatCurrency(debt.min_payment)}/mo</span>
                </span>

                {!isConfirming ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDelete(debt.id) }}
                    className="text-xs ml-auto hover:underline"
                    style={{ color: 'var(--quill-muted)' }}
                  >
                    Mark paid off
                  </button>
                ) : (
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-xs" style={{ color: 'var(--quill-muted)' }}>
                      Mark {debt.name} as paid off?
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); confirmMarkPaidOff(debt.id) }}
                      className="text-xs px-2 py-1 rounded-sm font-medium"
                      style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(null) }}
                      className="text-xs px-2 py-1 rounded-sm border"
                      style={{ borderColor: 'var(--quill-rule)', color: 'var(--quill-muted)' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add debt dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setForm(EMPTY_FORM); setTouched({}); setFieldErrors({}) } }}>
        <DialogContent style={{ background: 'var(--quill-cream)', borderColor: 'var(--quill-rule)' }}>
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--quill-ink)' }}>Add debt</DialogTitle>
            <DialogDescription>
              Enter your current balance, APR, and minimum payment. OpenQuill will show your payoff timeline and total interest.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            {[
              { label: 'Name', key: 'name', type: 'text', placeholder: 'USAA Credit Card', required: true },
              { label: 'Current balance', key: 'balance', type: 'number', placeholder: '1596.28', required: true },
              { label: 'APR (%) — find on your statement or bank app', key: 'apr', type: 'number', placeholder: '18.4', required: false },
              { label: 'Minimum payment/mo', key: 'min_payment', type: 'number', placeholder: '25.00', required: true },
              { label: 'Due date — MM/DD (optional)', key: 'due_date', type: 'text', placeholder: '03/16', required: false },
              { label: 'Months remaining (optional)', key: 'ends_in_months', type: 'number', placeholder: '18', required: false },
            ].map(({ label, key, type, placeholder, required }, idx) => (
              <div key={key}>
                <label
                  htmlFor={`debt-${key}`}
                  className="block text-xs font-medium mb-1 tracking-wide uppercase"
                  style={{ color: 'var(--quill-muted)' }}
                >
                  {label}
                </label>
                <input
                  id={`debt-${key}`}
                  type={type}
                  step={type === 'number' ? '0.01' : undefined}
                  required={required}
                  autoFocus={idx === 0}
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => {
                    setForm({ ...form, [key]: e.target.value })
                    if (fieldErrors[key]) setFieldErrors(prev => { const next = { ...prev }; delete next[key]; return next })
                  }}
                  onBlur={required ? () => handleBlur(key) : undefined}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 text-sm border rounded-sm focus:outline-none"
                  style={{
                    borderColor: fieldErrors[key] || (required && touched[key] && !form[key as keyof typeof form])
                      ? 'var(--quill-red)'
                      : 'var(--quill-rule)',
                    background: 'var(--quill-cream)',
                    color: 'var(--quill-ink)',
                  }}
                />
                {fieldErrors[key] && (
                  <p className="text-xs mt-1" style={{ color: 'var(--quill-red)' }}>{fieldErrors[key]}</p>
                )}
                {!fieldErrors[key] && required && touched[key] && !form[key as keyof typeof form] && (
                  <p className="text-xs mt-1" style={{ color: 'var(--quill-red)' }}>Required</p>
                )}
              </div>
            ))}

            <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--quill-ink)' }}>
              <input
                type="checkbox"
                checked={form.pay_in_full}
                onChange={(e) => setForm({ ...form, pay_in_full: e.target.checked })}
              />
              Should be paid in full each month
            </label>

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
                ) : 'Add debt'}
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
    </div>
  )
}

function DebtCardDetail({ debt, prefersReducedMotion }: { debt: Debt; prefersReducedMotion: boolean | null }) {
  const amortization = useMemo(
    () => generateAmortizationSchedule(debt.balance, debt.apr, debt.min_payment),
    [debt.balance, debt.apr, debt.min_payment],
  )

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ overflow: 'hidden' }}
    >
      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--quill-rule)' }}>
        {/* Payoff date + Total cost */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className="text-xs tracking-wide uppercase mb-1" style={{ color: 'var(--quill-muted)' }}>
              Payoff date
            </p>
            {amortization.payoffDate ? (
              <p className="font-mono text-sm font-semibold" style={{ color: 'var(--quill-ink)' }}>
                ~{amortization.payoffDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--quill-red)' }}>
                Never (at current minimums)
              </p>
            )}
            <p className="text-xs mt-0.5" style={{ color: 'var(--quill-muted)' }}>
              Estimated at minimum payments
            </p>
          </div>
          <div>
            <p className="text-xs tracking-wide uppercase mb-1" style={{ color: 'var(--quill-muted)' }}>
              Total cost
            </p>
            <p className="font-mono text-sm font-semibold" style={{ color: 'var(--quill-ink)' }}>
              {isFinite(amortization.totalPayments) ? formatCurrency(amortization.totalPayments) : '---'}
            </p>
            {isFinite(amortization.totalInterest) && amortization.totalInterest > 0 && (
              <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--quill-red)' }}>
                {formatCurrency(amortization.totalInterest)} in interest
              </p>
            )}
          </div>
        </div>

        {/* This month's payment breakdown */}
        {debt.apr > 0 && (
          <div className="mb-4">
            <p className="text-xs tracking-wide uppercase mb-2" style={{ color: 'var(--quill-muted)' }}>
              This month&apos;s payment
            </p>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span style={{ color: 'var(--quill-red)' }}>
                <span className="font-mono">{formatCurrency(amortization.currentMonthInterest)}</span> interest
              </span>
              <span style={{ color: 'var(--quill-green)' }}>
                <span className="font-mono">{formatCurrency(amortization.currentMonthPrincipal)}</span> principal
              </span>
            </div>
            <div
              className="w-full flex overflow-hidden"
              style={{ height: '6px', borderRadius: 2 }}
              role="img"
              aria-label={`This month: ${formatCurrency(amortization.currentMonthInterest)} goes to interest, ${formatCurrency(amortization.currentMonthPrincipal)} goes to principal`}
            >
              <div
                style={{
                  width: `${debt.min_payment > 0 ? (amortization.currentMonthInterest / debt.min_payment) * 100 : 50}%`,
                  background: 'var(--quill-red)',
                  borderRadius: '2px 0 0 2px',
                }}
              />
              <div
                style={{
                  width: `${debt.min_payment > 0 ? (amortization.currentMonthPrincipal / debt.min_payment) * 100 : 50}%`,
                  background: 'var(--quill-green)',
                  borderRadius: '0 2px 2px 0',
                }}
              />
            </div>
          </div>
        )}

        {/* First year breakdown */}
        {amortization.schedule.length > 12 && debt.apr > 0 && (
          <div className="mb-4">
            <p className="text-xs tracking-wide uppercase mb-2" style={{ color: 'var(--quill-muted)' }}>
              First year
            </p>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span style={{ color: 'var(--quill-red)' }}>
                <span className="font-mono">{formatCurrency(amortization.firstYearInterest)}</span> interest
              </span>
              <span style={{ color: 'var(--quill-green)' }}>
                <span className="font-mono">{formatCurrency(amortization.firstYearPrincipal)}</span> principal
              </span>
            </div>
            {(() => {
              const total = amortization.firstYearInterest + amortization.firstYearPrincipal
              const intPct = total > 0 ? (amortization.firstYearInterest / total) * 100 : 50
              return (
                <div
                  className="w-full flex overflow-hidden"
                  style={{ height: '6px', borderRadius: 2 }}
                  role="img"
                  aria-label={`First year: ${formatCurrency(amortization.firstYearInterest)} goes to interest, ${formatCurrency(amortization.firstYearPrincipal)} goes to principal`}
                >
                  <div style={{ width: `${intPct}%`, background: 'var(--quill-red)', borderRadius: '2px 0 0 2px' }} />
                  <div style={{ width: `${100 - intPct}%`, background: 'var(--quill-green)', borderRadius: '0 2px 2px 0' }} />
                </div>
              )
            })()}
          </div>
        )}

        {/* APR context */}
        {debt.apr > 0 && (
          <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
            {debt.apr}% APR means ~<span className="font-mono">{formatCurrency(debt.balance * (debt.apr / 100 / 12))}</span>/mo in interest on your current balance.
          </p>
        )}
        {debt.apr === 0 && amortization.payoffDate && (
          <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
            No interest — all payments go directly to principal. At <span className="font-mono">{formatCurrency(debt.min_payment)}/mo</span>, paid off in ~{amortization.schedule.length} months.
          </p>
        )}
      </div>
    </motion.div>
  )
}
