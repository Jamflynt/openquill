import { describe, it, expect } from 'vitest'

// Mirror of the inferYear + normalizeDate logic in app/api/statements/commit/route.ts
// Tests cover the year inference used when periodStart is not provided.

interface TxDate { date: string }

function inferYear(transactions: TxDate[]): number {
  const years = transactions
    .map((t) => t.date)
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .map((d) => parseInt(d.slice(0, 4)))
  if (years.length === 0) return new Date().getFullYear()
  const counts = years.reduce<Record<number, number>>((acc, y) => {
    acc[y] = (acc[y] ?? 0) + 1
    return acc
  }, {})
  return parseInt(Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0])
}

function normalizeDate(dateStr: string, statementYear: number): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  if (/^\d{1,2}\/\d{1,2}$/.test(dateStr)) {
    const [month, day] = dateStr.split('/')
    return `${statementYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }
  return dateStr
}

describe('inferYear', () => {
  it('returns the most common year from fully-dated transactions', () => {
    const txns = [
      { date: '2023-01-01' },
      { date: '2023-01-15' },
      { date: '2023-02-03' },
      { date: '2024-01-01' }, // minority
    ]
    expect(inferYear(txns)).toBe(2023)
  })

  it('falls back to current year when no full dates exist', () => {
    const txns = [{ date: '01/15' }, { date: '02/03' }]
    expect(inferYear(txns)).toBe(new Date().getFullYear())
  })

  it('handles a single fully-dated transaction', () => {
    expect(inferYear([{ date: '2022-06-15' }])).toBe(2022)
  })

  it('handles empty array by returning current year', () => {
    expect(inferYear([])).toBe(new Date().getFullYear())
  })
})

describe('normalizeDate', () => {
  it('passes through already-complete YYYY-MM-DD dates unchanged', () => {
    expect(normalizeDate('2023-06-15', 2023)).toBe('2023-06-15')
  })

  it('converts MM/DD format using the provided year', () => {
    expect(normalizeDate('6/15', 2023)).toBe('2023-06-15')
  })

  it('pads single-digit months and days', () => {
    expect(normalizeDate('1/5', 2023)).toBe('2023-01-05')
  })

  it('uses the provided statementYear, not the current year', () => {
    // Historical import: year 2021, imported in 2026
    expect(normalizeDate('03/20', 2021)).toBe('2021-03-20')
  })

  it('returns unparseable strings unchanged (caller validates)', () => {
    expect(normalizeDate('invalid', 2023)).toBe('invalid')
  })
})
