'use client'

import { useState } from 'react'
import { formatCurrency } from '@/lib/format'
import type { Account, Debt, FixedObligation, Transaction } from '@/types/database'

interface AffordabilityCalculatorProps {
  accounts: Account[]
  debts: Debt[]
  obligations: FixedObligation[]
  transactions: Transaction[]
  incomeBiweekly: number | null
  incomeMonthly: number | null
}

type Verdict = 'yes' | 'maybe' | 'not-right-now'

interface Analysis {
  verdict: Verdict
  explanation: string[]
  liquidAvailable: number
  discretionaryRemaining: number
  afterPurchase: number
}

const LIQUID_BUFFER = 500

function analyze(
  amount: number,
  accounts: Account[],
  debts: Debt[],
  obligations: FixedObligation[],
  transactions: Transaction[],
  incomeMonthly: number | null
): Analysis {
  // Liquid savings = checking + savings balances minus buffer
  const liquidTotal = accounts
    .filter((a) => a.type === 'checking' || a.type === 'savings')
    .reduce((sum, a) => sum + Math.max(0, a.balance), 0)
  const liquidAvailable = Math.max(0, liquidTotal - LIQUID_BUFFER)

  // Monthly income
  const income = incomeMonthly ?? transactions
    .filter((t) => t.is_income)
    .reduce((sum, t) => sum + t.amount, 0)

  // Fixed obligations total
  const fixedTotal = obligations.reduce((sum, o) => sum + o.amount, 0)

  // Spending so far this month (non-income, non-transfer debits)
  const spentSoFar = transactions
    .filter((t) => !t.is_income && !t.is_transfer && t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Discretionary remaining = income - fixed - already spent
  const discretionaryRemaining = Math.max(0, income - fixedTotal - spentSoFar)

  // High-interest debt flag (>$500 at >15% APR)
  const highInterestDebt = debts
    .filter((d) => d.apr > 15 && d.balance > 500)
    .reduce((sum, d) => sum + d.balance, 0)

  const afterPurchase = discretionaryRemaining - amount
  const afterPurchaseLiquid = liquidAvailable - amount

  const explanation: string[] = []
  let verdict: Verdict

  if (afterPurchase >= 0 && afterPurchaseLiquid >= 0) {
    verdict = 'yes'
    explanation.push(
      `You have ${formatCurrency(discretionaryRemaining)} in discretionary budget remaining this month.`
    )
    explanation.push(
      `After this purchase, you'd have ${formatCurrency(afterPurchase)} left for the rest of the month.`
    )
    if (highInterestDebt > 0) {
      explanation.push(
        `You're carrying ${formatCurrency(highInterestDebt)} in high-interest debt — paying it down is also a good use of this money.`
      )
    }
  } else if (afterPurchase < 0 && afterPurchaseLiquid >= 0) {
    verdict = 'maybe'
    explanation.push(
      `This exceeds your monthly discretionary budget by ${formatCurrency(Math.abs(afterPurchase))}.`
    )
    explanation.push(
      `Your liquid savings (minus a ${formatCurrency(LIQUID_BUFFER)} buffer) could cover it — you'd have ${formatCurrency(afterPurchaseLiquid)} remaining.`
    )
    if (highInterestDebt > 0) {
      explanation.push(
        `Consider whether this is more urgent than paying down your ${formatCurrency(highInterestDebt)} high-interest debt.`
      )
    }
  } else {
    verdict = 'not-right-now'
    explanation.push(
      `This exceeds both your monthly discretionary budget and available liquid savings.`
    )
    if (discretionaryRemaining > 0) {
      explanation.push(
        `You have ${formatCurrency(discretionaryRemaining)} in discretionary budget remaining, but the purchase would require ${formatCurrency(amount - discretionaryRemaining)} more.`
      )
    } else {
      explanation.push(`Your spending has already reached your monthly budget limit.`)
    }
    if (liquidAvailable < amount) {
      explanation.push(
        `Your accessible savings (after a ${formatCurrency(LIQUID_BUFFER)} safety buffer) are ${formatCurrency(liquidAvailable)}.`
      )
    }
  }

  return { verdict, explanation, liquidAvailable, discretionaryRemaining, afterPurchase }
}

const VERDICT_CONFIG = {
  yes: {
    label: 'Yes',
    icon: '✓',
    color: 'var(--quill-green)',
    bg: 'var(--quill-green-bg)',
    border: 'var(--quill-green)',
    sub: 'Within your budget.',
  },
  maybe: {
    label: 'Maybe',
    icon: '~',
    color: 'var(--quill-amber)',
    bg: 'var(--quill-amber-bg)',
    border: 'var(--quill-amber)',
    sub: 'Possible, but requires savings.',
  },
  'not-right-now': {
    label: 'Not right now',
    icon: '✗',
    color: 'var(--quill-red)',
    bg: 'var(--quill-red-bg)',
    border: 'var(--quill-red)',
    sub: 'Exceeds your current budget.',
  },
}

export default function AffordabilityCalculator({
  accounts,
  debts,
  obligations,
  transactions,
  incomeMonthly,
  incomeBiweekly,
}: AffordabilityCalculatorProps) {
  const [amountStr, setAmountStr] = useState('')
  const [result, setResult] = useState<Analysis | null>(null)

  // Resolve income: prefer monthly, fall back to biweekly × 26 / 12
  const resolvedMonthlyIncome = incomeMonthly
    ?? (incomeBiweekly != null ? (incomeBiweekly * 26) / 12 : null)

  function calculate(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(amountStr)
    if (isNaN(amount) || amount <= 0) return
    setResult(analyze(amount, accounts, debts, obligations, transactions, resolvedMonthlyIncome))
  }

  const verdict = result ? VERDICT_CONFIG[result.verdict] : null

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--quill-ink)' }}>
          Can I afford this?
        </h1>
        <p className="text-sm" style={{ color: 'var(--quill-muted)' }}>
          Enter an amount. Get an honest answer.
        </p>
      </div>

      <form onSubmit={calculate} className="space-y-4">
        <div className="relative">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-mono font-bold"
            style={{ color: 'var(--quill-muted)' }}
          >
            $
          </span>
          <input
            id="calc-amount"
            aria-label="Purchase amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amountStr}
            onChange={(e) => { setAmountStr(e.target.value); setResult(null) }}
            placeholder="0.00"
            autoFocus
            className="w-full pl-10 pr-4 py-5 text-3xl font-mono font-bold border-2 rounded-sm focus:outline-none text-center"
            style={{
              borderColor: result ? verdict!.border : 'var(--quill-rule)',
              background: 'var(--quill-cream)',
              color: 'var(--quill-ink)',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!amountStr || parseFloat(amountStr) <= 0}
          className="w-full py-4 text-base font-semibold tracking-wide rounded-sm transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-40"
          style={{
            background: 'var(--quill-green)',
            color: 'var(--quill-cream)',
          }}
        >
          Calculate &rarr;
        </button>
      </form>

      {/* Result */}
      <div aria-live="polite" aria-atomic="true">
      {result && verdict && (
        <div
          className="mt-6 border rounded-sm p-6"
          style={{ borderColor: verdict.border, background: verdict.bg }}
        >
          <div className="text-center mb-4">
            <p
              className="text-4xl font-bold font-mono mb-1"
              style={{ color: verdict.color }}
            >
              <span className="mr-2 text-3xl" aria-hidden="true">{verdict.icon}</span>{verdict.label}
            </p>
            <p className="text-xs uppercase tracking-widest" style={{ color: verdict.color }}>
              {verdict.sub}
            </p>
          </div>

          <div className="space-y-2">
            {result.explanation.map((line, i) => (
              <p key={i} className="text-sm" style={{ color: 'var(--quill-ink)' }}>
                {line}
              </p>
            ))}
          </div>

          {/* Quick stats */}
          <div
            className="mt-4 pt-4 grid grid-cols-2 gap-3"
            style={{ borderTop: `1px solid ${verdict.border}` }}
          >
            {[
              { label: 'Liquid available', value: result.liquidAvailable },
              { label: 'Discretionary left', value: result.discretionaryRemaining },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs tracking-wide uppercase mb-0.5" style={{ color: 'var(--quill-muted)' }}>
                  {label}
                </p>
                <p className="font-mono font-semibold text-sm" style={{ color: verdict.color }}>
                  {formatCurrency(value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Context note */}
      {!result && (
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
            Enter a purchase amount and click Calculate. You&apos;ll see whether it fits your current budget based on your income and spending.
          </p>
          {!resolvedMonthlyIncome ? (
            <p className="text-xs mt-2" style={{ color: 'var(--quill-amber)' }}>
              For an accurate result,{' '}
              <a href="/settings" className="underline" style={{ color: 'var(--quill-amber)' }}>
                set your take-home income in Settings →
              </a>
            </p>
          ) : (
            <p className="text-xs mt-2" style={{ color: 'var(--quill-muted)' }}>
              Based on your income and current spending.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
