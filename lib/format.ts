export function formatCurrency(amount: number, showSign = false): string {
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs)

  if (showSign && amount > 0) return `+${formatted}`
  if (amount < 0) return `-${formatted}`
  return formatted
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatMonth(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function getAmountClass(amount: number): string {
  if (amount > 0) return 'amount-positive'
  if (amount < 0) return 'amount-negative'
  return 'amount-neutral'
}

export function calcPayoffMonths(balance: number, apr: number, minPayment: number): number {
  if (apr === 0 || minPayment <= 0) {
    if (minPayment <= 0) return Infinity
    return Math.ceil(balance / minPayment)
  }
  const monthlyRate = apr / 100 / 12
  if (minPayment <= balance * monthlyRate) return Infinity
  return Math.ceil(
    -Math.log(1 - (balance * monthlyRate) / minPayment) / Math.log(1 + monthlyRate)
  )
}

export function calcTotalInterest(balance: number, apr: number, minPayment: number): number {
  if (apr === 0) return 0
  const months = calcPayoffMonths(balance, apr, minPayment)
  if (!isFinite(months)) return Infinity
  return Math.max(0, months * minPayment - balance)
}

export interface AmortizationMonth {
  month: number
  startBalance: number
  interestCharge: number
  principalPaid: number
  payment: number
  endBalance: number
}

export interface AmortizationSummary {
  schedule: AmortizationMonth[]
  totalInterest: number
  totalPayments: number
  payoffDate: Date | null
  firstYearInterest: number
  firstYearPrincipal: number
  currentMonthInterest: number
  currentMonthPrincipal: number
}

export function generateAmortizationSchedule(
  balance: number,
  apr: number,
  minPayment: number,
): AmortizationSummary {
  const monthlyRate = apr / 100 / 12
  const schedule: AmortizationMonth[] = []
  let remaining = balance
  let totalInterest = 0
  let totalPayments = 0
  let firstYearInterest = 0
  let firstYearPrincipal = 0
  const MAX_MONTHS = 600

  if (remaining <= 0) {
    return {
      schedule: [],
      totalInterest: 0,
      totalPayments: 0,
      payoffDate: null,
      firstYearInterest: 0,
      firstYearPrincipal: 0,
      currentMonthInterest: 0,
      currentMonthPrincipal: 0,
    }
  }

  if (minPayment <= 0 || (apr > 0 && minPayment <= remaining * monthlyRate)) {
    const interest = remaining * monthlyRate
    return {
      schedule: [],
      totalInterest: Infinity,
      totalPayments: Infinity,
      payoffDate: null,
      firstYearInterest: apr > 0 ? interest * 12 : 0,
      firstYearPrincipal: 0,
      currentMonthInterest: interest,
      currentMonthPrincipal: Math.max(0, minPayment - interest),
    }
  }

  for (let m = 1; m <= MAX_MONTHS && remaining > 0.005; m++) {
    const interestCharge = remaining * monthlyRate
    const payment = Math.min(minPayment, remaining + interestCharge)
    const principalPaid = payment - interestCharge
    const endBalance = Math.max(0, remaining - principalPaid)

    schedule.push({ month: m, startBalance: remaining, interestCharge, principalPaid, payment, endBalance })

    totalInterest += interestCharge
    totalPayments += payment
    if (m <= 12) {
      firstYearInterest += interestCharge
      firstYearPrincipal += principalPaid
    }
    remaining = endBalance
  }

  const now = new Date()
  const payoffDate = schedule.length > 0
    ? new Date(now.getFullYear(), now.getMonth() + schedule.length, 1)
    : null

  return {
    schedule,
    totalInterest,
    totalPayments,
    payoffDate,
    firstYearInterest,
    firstYearPrincipal,
    currentMonthInterest: schedule[0]?.interestCharge ?? 0,
    currentMonthPrincipal: schedule[0]?.principalPaid ?? 0,
  }
}
