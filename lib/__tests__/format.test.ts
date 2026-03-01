import { describe, it, expect } from 'vitest'
import { formatCurrency, calcPayoffMonths, calcTotalInterest, generateAmortizationSchedule } from '../format'

describe('formatCurrency', () => {
  it('formats positive amounts', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })
  it('formats negative amounts with leading minus', () => {
    expect(formatCurrency(-500)).toBe('-$500.00')
  })
  it('formats large numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00')
  })
  it('shows + sign when showSign=true and amount is positive', () => {
    expect(formatCurrency(99.99, true)).toBe('+$99.99')
  })
  it('does not show + sign for zero even with showSign=true', () => {
    expect(formatCurrency(0, true)).toBe('$0.00')
  })
})

describe('calcPayoffMonths', () => {
  it('returns Infinity when payment is zero or negative', () => {
    expect(calcPayoffMonths(5000, 20, 0)).toBe(Infinity)
  })
  it('returns Infinity when payment cannot cover monthly interest', () => {
    // 5000 * 20% / 12 = $83.33/month interest; $50 payment cannot cover it
    expect(calcPayoffMonths(5000, 20, 50)).toBe(Infinity)
  })
  it('returns a reasonable number of months for standard inputs', () => {
    // $5000 balance, 20% APR, $200/month → roughly 32 months
    const months = calcPayoffMonths(5000, 20, 200)
    expect(months).toBeGreaterThan(20)
    expect(months).toBeLessThan(50)
  })
  it('handles 0% APR correctly', () => {
    // $1200 at 0% APR, $100/month → exactly 12 months
    expect(calcPayoffMonths(1200, 0, 100)).toBe(12)
  })
  it('rounds up to whole months', () => {
    // $100 at 0% APR, $33/month → ceil(100/33) = ceil(3.03) = 4 months
    expect(calcPayoffMonths(100, 0, 33)).toBe(4)
  })
})

describe('calcTotalInterest', () => {
  it('returns 0 for 0% APR', () => {
    expect(calcTotalInterest(5000, 0, 200)).toBe(0)
  })
  it('returns Infinity when payment cannot cover monthly interest', () => {
    expect(calcTotalInterest(5000, 20, 50)).toBe(Infinity)
  })
  it('total interest approximates (months × payment) − balance', () => {
    const balance = 5000
    const apr = 20
    const payment = 200
    const months = calcPayoffMonths(balance, apr, payment)
    const interest = calcTotalInterest(balance, apr, payment)
    expect(interest).toBeCloseTo(months * payment - balance, 0)
  })
  it('returns a positive value for non-zero APR with sufficient payment', () => {
    expect(calcTotalInterest(1000, 18, 100)).toBeGreaterThan(0)
  })
})

describe('generateAmortizationSchedule', () => {
  it('returns correct payoff for 0% APR', () => {
    const result = generateAmortizationSchedule(1200, 0, 100)
    expect(result.schedule).toHaveLength(12)
    expect(result.totalInterest).toBe(0)
    expect(result.totalPayments).toBeCloseTo(1200, 0)
    expect(result.payoffDate).not.toBeNull()
  })

  it('returns null payoff date when payment cannot cover interest', () => {
    const result = generateAmortizationSchedule(5000, 20, 50)
    expect(result.payoffDate).toBeNull()
    expect(result.totalInterest).toBe(Infinity)
    expect(result.currentMonthInterest).toBeGreaterThan(0)
  })

  it('computes reasonable schedule for standard debt', () => {
    const result = generateAmortizationSchedule(5000, 20, 200)
    expect(result.schedule.length).toBeGreaterThan(20)
    expect(result.schedule.length).toBeLessThan(50)
    expect(result.totalInterest).toBeGreaterThan(0)
    expect(result.totalPayments).toBeCloseTo(result.totalInterest + 5000, 0)
    expect(result.payoffDate).not.toBeNull()
  })

  it('first month interest + principal equals payment', () => {
    const result = generateAmortizationSchedule(5000, 18, 150)
    const m1 = result.schedule[0]
    expect(m1.interestCharge + m1.principalPaid).toBeCloseTo(m1.payment, 2)
  })

  it('final month balance reaches zero', () => {
    const result = generateAmortizationSchedule(1000, 12, 100)
    const last = result.schedule[result.schedule.length - 1]
    expect(last.endBalance).toBeCloseTo(0, 2)
  })

  it('first year sums match schedule slice', () => {
    const result = generateAmortizationSchedule(10000, 24, 300)
    const first12 = result.schedule.slice(0, 12)
    const sumInterest = first12.reduce((s, m) => s + m.interestCharge, 0)
    const sumPrincipal = first12.reduce((s, m) => s + m.principalPaid, 0)
    expect(result.firstYearInterest).toBeCloseTo(sumInterest, 2)
    expect(result.firstYearPrincipal).toBeCloseTo(sumPrincipal, 2)
  })

  it('handles zero balance', () => {
    const result = generateAmortizationSchedule(0, 18, 100)
    expect(result.schedule).toHaveLength(0)
    expect(result.payoffDate).toBeNull()
  })
})
