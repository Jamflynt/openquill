// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSupabase, makeBuilder } from '../../../../tests/helpers/mock-supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { POST } from '../statements/commit/route'

const TEST_USER = { id: 'user-123', email: 'test@test.com' }
const VALID_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111'
const VALID_STATEMENT_ID = '22222222-2222-4222-8222-222222222222'

const VALID_TX = {
  date: '2026-01-15',
  description: 'Grocery Store',
  amount: -95.43,
  suggestedCategory: 'Food & Groceries',
  isIncome: false,
  isTransfer: false,
}

function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/statements/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// from() call order in the commit route:
//   1. users           — .select('subscription_tier').eq().single()
//   2. statements      — .select('id', { count }).eq().gte()  [head count, resolved via then]
//   3. accounts        — .select('id').eq().eq().single()
//   4. statements      — .insert({...}).select('id').single()
//   5. transactions    — .insert(rows)                        [resolved via then]
//   6. accounts        — .update({...}).eq().eq()             [resolved via then]
// On tx insert failure: rollback call — from('statements').delete().eq()

describe('POST /api/statements/commit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated user', async () => {
    const { client } = createMockSupabase(null)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({ accountId: VALID_ACCOUNT_ID, transactions: [VALID_TX] }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for invalid accountId (not UUID)', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({ accountId: 'not-a-uuid', transactions: [VALID_TX] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for empty transactions array', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({ accountId: VALID_ACCOUNT_ID, transactions: [] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when accountId is missing', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({ transactions: [VALID_TX] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when transactions field is missing', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({ accountId: VALID_ACCOUNT_ID }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON body', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)

    const req = new NextRequest('http://localhost/api/statements/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when transactions array exceeds 500 items', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const transactions = Array.from({ length: 501 }, () => ({ ...VALID_TX }))
    const res = await POST(makePostRequest({ accountId: VALID_ACCOUNT_ID, transactions }))
    expect(res.status).toBe(400)
  })

  it('returns 404 when account does not belong to user', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    // Call 1: users subscription_tier lookup
    // Call 2: statements count (rate limit check) — count: 0 means under limit
    // Call 3: accounts ownership check — returns error (not found)
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { subscription_tier: 'free' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null, count: 0 }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'not found' } }))

    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({ accountId: VALID_ACCOUNT_ID, transactions: [VALID_TX] }))
    expect(res.status).toBe(404)
  })

  it('returns 429 when rate limit exceeded (free tier, >= 20 commits in last hour)', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    // Call 1: users subscription_tier lookup
    // Call 2: statements count — count: 25 exceeds free tier limit of 20
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { subscription_tier: 'free' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null, count: 25 }))

    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({ accountId: VALID_ACCOUNT_ID, transactions: [VALID_TX] }))
    expect(res.status).toBe(429)
  })

  it('does not rate-limit pro users (count above free limit is allowed)', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    // Pro user — Infinity limit — 25 commits should still pass rate limit
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { subscription_tier: 'pro' }, error: null }))  // users
      .mockReturnValueOnce(makeBuilder({ data: null, error: null, count: 25 }))               // statements count
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_ACCOUNT_ID }, error: null }))      // accounts ownership
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_STATEMENT_ID }, error: null }))    // statements insert
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))                          // transactions insert
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))                          // accounts balance update

    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({
      accountId: VALID_ACCOUNT_ID,
      transactions: [VALID_TX],
    }))
    expect(res.status).toBe(200)
  })

  it('successfully commits transactions and returns count', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { subscription_tier: 'free' }, error: null }))               // users
      .mockReturnValueOnce(makeBuilder({ data: null, error: null, count: 0 }))                              // statements count
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_ACCOUNT_ID }, error: null }))                    // accounts ownership
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_STATEMENT_ID }, error: null }))                  // statements insert
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))                                        // transactions insert
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))                                        // accounts balance update

    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({
      accountId: VALID_ACCOUNT_ID,
      transactions: [VALID_TX],
      endingBalance: 5000,
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.count).toBe(1)
  })

  it('returns statementId in successful response', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { subscription_tier: 'free' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null, count: 0 }))
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_ACCOUNT_ID }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_STATEMENT_ID }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))

    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({
      accountId: VALID_ACCOUNT_ID,
      transactions: [VALID_TX],
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.statementId).toBe(VALID_STATEMENT_ID)
  })

  it('returns correct count when committing multiple transactions', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { subscription_tier: 'free' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null, count: 0 }))
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_ACCOUNT_ID }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_STATEMENT_ID }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))

    vi.mocked(createClient).mockResolvedValue(client as never)

    const threeTxns = [{ ...VALID_TX }, { ...VALID_TX, date: '2026-01-16' }, { ...VALID_TX, date: '2026-01-17' }]
    const res = await POST(makePostRequest({
      accountId: VALID_ACCOUNT_ID,
      transactions: threeTxns,
    }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.count).toBe(3)
  })

  it('returns 500 when statement insert fails', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { subscription_tier: 'free' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null, count: 0 }))
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_ACCOUNT_ID }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'statement insert failed' } })) // statements insert

    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({ accountId: VALID_ACCOUNT_ID, transactions: [VALID_TX] }))
    expect(res.status).toBe(500)
  })

  it('does not leak db error details on transaction insert failure', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { subscription_tier: 'free' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null, count: 0 }))
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_ACCOUNT_ID }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_STATEMENT_ID }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: { message: 'violates foreign key constraint "transactions_statement_id_fkey"', code: '23503' } }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null })) // rollback: statements delete

    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({ accountId: VALID_ACCOUNT_ID, transactions: [VALID_TX] }))
    expect(res.status).toBe(500)
    const body = await res.json()
    // Must NOT include raw DB error details
    expect(body.detail).toBeUndefined()
    expect(body.code).toBeUndefined()
    expect(body.error).toBeTypeOf('string')
  })

  it('accepts optional period dates as YYYY-MM-DD strings', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom
      .mockReturnValueOnce(makeBuilder({ data: { subscription_tier: 'free' }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null, count: 0 }))
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_ACCOUNT_ID }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: { id: VALID_STATEMENT_ID }, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))
      .mockReturnValueOnce(makeBuilder({ data: null, error: null }))

    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({
      accountId: VALID_ACCOUNT_ID,
      transactions: [VALID_TX],
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      beginningBalance: 4800,
      endingBalance: 5000,
    }))
    expect(res.status).toBe(200)
  })

  it('returns 400 for period date not matching YYYY-MM-DD format', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({
      accountId: VALID_ACCOUNT_ID,
      transactions: [VALID_TX],
      periodStart: '01/01/2026', // wrong format
    }))
    expect(res.status).toBe(400)
  })
})
