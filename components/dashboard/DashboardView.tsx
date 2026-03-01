'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, animate as fmAnimate, useReducedMotion } from 'framer-motion'
import { formatCurrency } from '@/lib/format'
import type { Account, Debt, SavingsGoal, FixedObligation } from '@/types/database'

interface DashboardViewProps {
  accounts: Account[]
  debts: Debt[]
  goals: SavingsGoal[]
  obligations: FixedObligation[]
  periodLabel: string
  netPosition: number
  totalIncome: number
  totalSpending: number
  spendingByCategory: Record<string, number>
}

// Muted earthy fill colors for the ledger rows — same ink, different weight
const BAR_COLORS = [
  'var(--quill-green)',
  '#4A6E5A',
  'var(--quill-amber)',
  '#6B4F30',
  'var(--quill-red)',
  'var(--quill-green-light)',
  'var(--quill-muted)',
]

export default function DashboardView({
  accounts,
  debts,
  goals,
  obligations,
  periodLabel,
  netPosition,
  totalIncome,
  totalSpending,
  spendingByCategory,
}: DashboardViewProps) {

  const prefersReducedMotion = useReducedMotion()

  // F-03: Count-up animation for net position hero number
  const [displayNet, setDisplayNet] = useState(0)
  useEffect(() => {
    if (prefersReducedMotion) { setDisplayNet(netPosition); return }
    const controls = fmAnimate(0, netPosition, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayNet(v),
    })
    return () => controls.stop()
  }, [netPosition, prefersReducedMotion])

  const categoryRows = Object.entries(spendingByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, amount]) => ({
      category: category.replace(' / ', '/'),
      amount,
      pct: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
    }))

  const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0)
  const highestAprDebt = debts.length
    ? debts.reduce((max, d) => (d.apr > max.apr ? d : max), debts[0])
    : null
  const totalMinPayments = debts.reduce((sum, d) => sum + d.min_payment, 0)

  const savingsAccounts = accounts.filter((a) => a.type === 'savings')

  const isEmpty =
    obligations.length === 0 &&
    goals.length === 0 &&
    debts.length === 0 &&
    categoryRows.length === 0 &&
    totalIncome === 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-8">

      {/* ── Persistent import CTA — always visible (S3-3) ─────────────── */}
      <div className="flex justify-end">
        <Link
          href="/statements/import"
          className="text-xs underline"
          style={{ color: 'var(--quill-green)' }}
        >
          Import statement →
        </Link>
      </div>

      <h1 className="sr-only">Dashboard</h1>

      {/* ── Net Position Hero ─────────────────────────────────────────────
          Typographic statement. No card border. Number speaks plainly.
      ──────────────────────────────────────────────────────────────────── */}
      <div
        className="py-8"
        style={{ borderTop: '1px solid var(--quill-rule)', borderBottom: '1px solid var(--quill-rule)' }}
      >
        <h2
          className="text-xs tracking-widest uppercase mb-4"
          style={{ color: 'var(--quill-muted)' }}
        >
          Net · {periodLabel}
        </h2>
        {/* F-03: Animated count-up hero number */}
        <p
          className="font-display leading-none tracking-tight mb-3"
          style={{
            fontSize: 'clamp(3rem, 12vw, 5rem)',
            color: netPosition >= 0 ? 'var(--quill-green)' : 'var(--quill-red)',
            fontFamily: 'var(--font-playfair)',
            fontWeight: 700,
          }}
        >
          {displayNet >= 0 ? '+' : ''}{formatCurrency(displayNet)}
        </p>
        <p className="text-sm" style={{ color: 'var(--quill-muted)' }}>
          {netPosition >= 0
            ? 'You are ahead.'
            : 'Spending exceeded income.'}
        </p>
      </div>

      {/* ── Income / Spending ─────────────────────────────────────────────
          Two-column split, clean and quiet.
      ──────────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Income', value: totalIncome, color: 'var(--quill-green)' },
          { label: 'Spending', value: totalSpending, color: 'var(--quill-red)' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="border rounded-sm p-4 quill-card-lift"
            style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
          >
            <p
              className="text-xs tracking-wide uppercase mb-1.5"
              style={{ color: 'var(--quill-muted)' }}
            >
              {stat.label}
            </p>
            <p
              className="num text-xl font-semibold"
              style={{ color: stat.color, fontFamily: 'var(--font-plex-mono)' }}
            >
              {formatCurrency(stat.value)}
            </p>
          </div>
        ))}
      </div>

      {/* ── F-13 Section Divider: Spending ──────────────────────────────── */}
      {categoryRows.length > 0 && (
        <div className="flex items-center gap-3 mb-3 mt-6">
          <span className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--quill-muted)' }}>
            Spending
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--quill-rule)' }} />
        </div>
      )}

      {/* ── Spending by Category — OpenQuill Table ───────────────────────────
          Columnar layout. Real ledger paper. No chart library.
          Category | Amount | % | inline fill bar
      ──────────────────────────────────────────────────────────────────── */}
      {categoryRows.length > 0 && (
        <div>
          {/* Column headers */}
          <div
            className="flex items-center justify-between pb-2 mb-1"
            style={{ borderBottom: '1px solid var(--quill-rule)' }}
          >
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: 'var(--quill-muted)' }}
            >
              Spending by category
            </span>
            <div className="flex items-center gap-5">
              <span
                className="text-xs tracking-widest uppercase"
                style={{ color: 'var(--quill-muted)' }}
              >
                Amount
              </span>
              <span
                className="text-xs tracking-widest uppercase w-7 text-right"
                style={{ color: 'var(--quill-muted)' }}
              >
                %
              </span>
            </div>
          </div>

          {/* Category rows — F-03 staggered fade-in */}
          {categoryRows.map(({ category, amount, pct }, index) => (
            <motion.div
              key={index}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="py-3"
              style={{ borderBottom: '1px solid var(--quill-rule)' }}
            >
              {/* Text row */}
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-sm" style={{ color: 'var(--quill-ink)' }}>
                  {category}
                </span>
                <div className="flex items-baseline gap-5 shrink-0 ml-4">
                  <span
                    className="num text-sm"
                    style={{
                      color: 'var(--quill-ink)',
                      fontFamily: 'var(--font-plex-mono)',
                    }}
                  >
                    {formatCurrency(amount)}
                  </span>
                  <span
                    className="num text-xs w-7 text-right"
                    style={{
                      color: 'var(--quill-muted)',
                      fontFamily: 'var(--font-plex-mono)',
                    }}
                  >
                    {pct}%
                  </span>
                </div>
              </div>

              {/* F-04: Inline fill bar — h-1 (4px), rounded end-caps */}
              <div
                className="w-full overflow-hidden"
                role="img"
                aria-label={`${category}: ${pct}% of total spending`}
                style={{ height: '4px', background: 'var(--quill-rule)', borderRadius: 2 }}
              >
                {/* F-03: Animated bar fill */}
                <motion.div
                  className="h-full"
                  style={{
                    background: BAR_COLORS[index % BAR_COLORS.length],
                    borderRadius: 2,
                  }}
                  initial={prefersReducedMotion ? false : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.05 }}
                />
              </div>
            </motion.div>
          ))}

          {/* Total row */}
          <div className="flex justify-between items-center py-3">
            <span className="text-xs" style={{ color: 'var(--quill-muted)' }}>
              Total spending
            </span>
            <span
              className="num text-sm font-semibold"
              style={{ color: 'var(--quill-red)', fontFamily: 'var(--font-plex-mono)' }}
            >
              {formatCurrency(totalSpending)}
            </span>
          </div>
        </div>
      )}

      {/* ── F-13 Section Divider: Planning ──────────────────────────────── */}
      {(debts.length > 0 || goals.length > 0 || obligations.length > 0) && (
        <div className="flex items-center gap-3 mb-3 mt-6">
          <span className="text-xs font-medium tracking-widest uppercase" style={{ color: 'var(--quill-muted)' }}>
            Planning
          </span>
          <div className="flex-1 h-px" style={{ background: 'var(--quill-rule)' }} />
        </div>
      )}

      {/* ── Debt Summary ──────────────────────────────────────────────────  */}
      {debts.length > 0 && (
        <div
          className="border rounded-sm p-5 quill-card-lift"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: 'var(--quill-muted)' }}
            >
              Debt
            </p>
            <Link href="/debts" className="text-xs underline" style={{ color: 'var(--quill-green)' }}>
              Manage →
            </Link>
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <p
              className="num text-2xl font-semibold"
              style={{ color: 'var(--quill-red)', fontFamily: 'var(--font-plex-mono)' }}
            >
              {formatCurrency(totalDebt)}
            </p>
            <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
              {formatCurrency(totalMinPayments)}/mo minimums
            </p>
          </div>
          {highestAprDebt && highestAprDebt.apr > 0 && (
            <p className="text-xs" style={{ color: 'var(--quill-amber)' }}>
              Highest rate: {highestAprDebt.name} at {highestAprDebt.apr}% APR
            </p>
          )}
        </div>
      )}

      {/* ── Savings Goals ─────────────────────────────────────────────────  */}
      {goals.length > 0 && (
        <div
          className="border rounded-sm p-5 space-y-5 quill-card-lift"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
        >
          <div className="flex items-center justify-between">
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: 'var(--quill-muted)' }}
            >
              Savings goals
            </p>
            <Link href="/goals" className="text-xs underline" style={{ color: 'var(--quill-green)' }}>
              Manage →
            </Link>
          </div>
          {/* F-03: Staggered fade-in for goal rows */}
          {goals.map((goal, index) => {
            const linked = savingsAccounts.find((a) => a.id === goal.account_id)
            const current = linked?.balance ?? null
            const pct = current != null ? Math.min(100, (current / goal.goal_amount) * 100) : 0
            return (
              <motion.div
                key={goal.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <div className="flex justify-between text-xs mb-2">
                  <span style={{ color: 'var(--quill-ink)' }}>{goal.name}</span>
                  <span
                    className="num"
                    style={{ color: 'var(--quill-muted)', fontFamily: 'var(--font-plex-mono)' }}
                  >
                    {current != null
                      ? `${formatCurrency(current)} / ${formatCurrency(goal.goal_amount)}`
                      : formatCurrency(goal.goal_amount)}
                  </span>
                </div>
                {/* Progress bar — no rounded caps, precise */}
                <div
                  className="w-full overflow-hidden"
                  style={{ height: '2px', background: 'var(--quill-rule)', borderRadius: 0 }}
                >
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, background: 'var(--quill-green)', borderRadius: 0 }}
                  />
                </div>
                <p className="text-xs mt-1.5" style={{ color: 'var(--quill-muted)' }}>
                  {current != null
                    ? `${pct.toFixed(0)}% funded`
                    : 'Link an account in Goals to track progress'}
                </p>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ── Fixed Obligations ─────────────────────────────────────────────  */}
      {obligations.length > 0 && (
        <div
          className="border rounded-sm quill-card-lift"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
        >
          <p
            className="text-xs tracking-widest uppercase px-5 pt-4 pb-3"
            style={{ color: 'var(--quill-muted)' }}
          >
            Fixed obligations
          </p>
          {/* F-03: Staggered fade-in for obligation rows */}
          {obligations.map((ob, index) => (
            <motion.div
              key={ob.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex justify-between px-5 py-2.5 text-sm"
              style={{ borderTop: index > 0 ? '1px solid var(--quill-rule)' : undefined }}
            >
              <span style={{ color: 'var(--quill-ink)' }}>{ob.name}</span>
              <span
                className="num"
                style={{ color: 'var(--quill-red)', fontFamily: 'var(--font-plex-mono)' }}
              >
                {formatCurrency(ob.amount)}
              </span>
            </motion.div>
          ))}
          <div
            className="flex justify-between px-5 py-3 text-xs font-medium"
            style={{ borderTop: '1px solid var(--quill-rule)', color: 'var(--quill-muted)' }}
          >
            <span>Total fixed</span>
            <span
              className="num"
              style={{ color: 'var(--quill-red)', fontFamily: 'var(--font-plex-mono)' }}
            >
              {formatCurrency(obligations.reduce((s, o) => s + o.amount, 0))}
            </span>
          </div>
        </div>
      )}

      {/* ── Feature discovery — shown when feature has no data but user has activity (S3-4) */}
      {debts.length === 0 && !isEmpty && (
        <div
          className="border rounded-sm p-4 quill-card-lift"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--quill-muted)' }}>
              Debt
            </p>
            <Link href="/debts" className="text-xs underline" style={{ color: 'var(--quill-green)' }}>
              Track debts →
            </Link>
          </div>
          <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
            Track debts without sharing with third-party aggregators. See payoff timelines and total interest — just for you.
          </p>
        </div>
      )}

      {goals.length === 0 && !isEmpty && (
        <div
          className="border rounded-sm p-4 quill-card-lift"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--quill-muted)' }}>
              Goals
            </p>
            <Link href="/goals" className="text-xs underline" style={{ color: 'var(--quill-green)' }}>
              Track goals →
            </Link>
          </div>
          <p className="text-xs" style={{ color: 'var(--quill-muted)' }}>
            Track savings goals here — emergency fund, vacation, down payment. Link an account to see progress automatically.
          </p>
        </div>
      )}

      {/* ── Onboarding Empty State ────────────────────────────────────────  */}
      {isEmpty && (
        <div
          className="border rounded-sm p-6 quill-card-lift"
          style={{ borderColor: 'var(--quill-rule)', background: 'var(--quill-card)' }}
        >
          <p className="text-sm font-medium mb-5" style={{ color: 'var(--quill-ink)' }}>
            Get started in two steps
          </p>
          <div className="space-y-0">
            {[
              {
                step: '1',
                title: 'Import a statement',
                desc: 'Copy and paste text from any bank statement. Claude extracts your transactions.',
                href: '/statements/import',
                cta: 'Import statement →',
              },
              {
                step: '2',
                title: 'Set your income (optional)',
                desc: 'So the affordability calculator and spending summary can give you accurate answers.',
                href: '/settings',
                cta: 'Open settings →',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="flex gap-4 py-4"
                style={{ borderTop: i > 0 ? '1px solid var(--quill-rule)' : undefined }}
              >
                <div
                  className="w-6 h-6 flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5"
                  style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
                >
                  {item.step}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--quill-ink)' }}>
                    {item.title}
                  </p>
                  <p className="text-xs mb-2" style={{ color: 'var(--quill-muted)' }}>
                    {item.desc}
                  </p>
                  <Link
                    href={item.href}
                    className="inline-flex items-center px-4 py-2 text-xs font-medium rounded-sm"
                    style={{ background: 'var(--quill-green)', color: 'var(--quill-cream)' }}
                  >
                    {item.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
