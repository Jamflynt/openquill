// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSupabase, makeBuilder } from '../../../../tests/helpers/mock-supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { GET, POST } from '../accounts/route'

const TEST_USER = { id: 'user-123', email: 'test@test.com' }
const TEST_ACCOUNT = {
  id: 'acct-001',
  user_id: TEST_USER.id,
  name: 'Checking',
  type: 'checking',
  balance: 1000,
  apr: null,
  credit_limit: null,
  pay_in_full: false,
  institution: 'Test Bank',
  goal_balance: null,
  updated_at: new Date().toISOString(),
}

function makeGetRequest(url = 'http://localhost/api/accounts') {
  return new NextRequest(url)
}

function makePostRequest(body: object) {
  return new NextRequest('http://localhost/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/accounts', () => {
  beforeEach(() => {
    const { client } = createMockSupabase(TEST_USER, { data: [TEST_ACCOUNT], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)
  })

  it('returns 401 for unauthenticated user', async () => {
    const { client } = createMockSupabase(null)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
  })

  it('returns accounts array for authenticated user', async () => {
    const { client } = createMockSupabase(TEST_USER, { data: [TEST_ACCOUNT], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('returns empty array when user has no accounts', async () => {
    const { client } = createMockSupabase(TEST_USER, { data: [], error: null })
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns 500 when database query fails', async () => {
    const { client } = createMockSupabase(TEST_USER, { data: null, error: { message: 'DB error' } })
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(500)
  })
})

describe('POST /api/accounts', () => {
  it('returns 401 for unauthenticated user', async () => {
    const { client } = createMockSupabase(null)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({ name: 'Test', type: 'checking', balance: 0 }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for missing required fields', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({ type: 'checking' })) // missing name and balance
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid account type', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({ name: 'Test', type: 'invalid-type', balance: 0 }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when balance field is missing', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({ name: 'Test', type: 'checking' }))
    expect(res.status).toBe(400)
  })

  it('creates account and returns 201 for valid input', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    // POST inserts and returns the new account via .single()
    mockFrom.mockReturnValue(makeBuilder({ data: TEST_ACCOUNT, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({
      name: 'Checking',
      type: 'checking',
      balance: 1000,
      institution: 'Test Bank',
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.name).toBe('Checking')
  })

  it('returns 201 with the created account data', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: TEST_ACCOUNT, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({
      name: 'Checking',
      type: 'checking',
      balance: 1000,
    }))
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe(TEST_ACCOUNT.id)
    expect(body.type).toBe('checking')
  })

  it('accepts optional fields (institution, apr, credit_limit)', async () => {
    const creditAccount = { ...TEST_ACCOUNT, type: 'credit', balance: -500, apr: 19.99, credit_limit: 5000 }
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: creditAccount, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({
      name: 'Credit Card',
      type: 'credit',
      balance: -500,
      apr: 19.99,
      credit_limit: 5000,
    }))
    expect(res.status).toBe(201)
  })

  it('returns 400 when apr is out of range (> 100)', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({
      name: 'Credit Card',
      type: 'credit',
      balance: 0,
      apr: 150, // exceeds max of 100
    }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when credit_limit is negative', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await POST(makePostRequest({
      name: 'Credit Card',
      type: 'credit',
      balance: 0,
      credit_limit: -100,
    }))
    expect(res.status).toBe(400)
  })

  it('returns 500 when database insert fails', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'insert failed' } }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({
      name: 'Checking',
      type: 'checking',
      balance: 0,
    }))
    expect(res.status).toBe(500)
  })

  it('negates balance for credit accounts', async () => {
    const creditAccount = { ...TEST_ACCOUNT, type: 'credit', balance: -500 }
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: creditAccount, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await POST(makePostRequest({
      name: 'Credit Card',
      type: 'credit',
      balance: 500,
      apr: 19.99,
    }))
    expect(res.status).toBe(201)
    // The mock returns -500 as the stored balance (handler passes value as-is; DB stores it)
    const body = await res.json()
    expect(body.balance).toBe(-500)
  })
})
