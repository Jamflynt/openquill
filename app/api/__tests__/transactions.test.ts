// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createMockSupabase, makeBuilder } from '../../../../tests/helpers/mock-supabase'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { PATCH } from '../transactions/[id]/route'

const TEST_USER = { id: 'user-123', email: 'test@test.com' }
const TEST_TX_ID = 'tx-001'

function makePatchRequest(id: string, body: object) {
  return new NextRequest(`http://localhost/api/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockParams = (id: string) => ({ params: Promise.resolve({ id }) })

describe('PATCH /api/transactions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 for unauthenticated user', async () => {
    const { client } = createMockSupabase(null)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await PATCH(makePatchRequest(TEST_TX_ID, { category: 'Housing' }), mockParams(TEST_TX_ID))
    expect(res.status).toBe(401)
  })

  it('returns 400 for notes exceeding 500 characters', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)
    const res = await PATCH(
      makePatchRequest(TEST_TX_ID, { user_notes: 'x'.repeat(501) }),
      mockParams(TEST_TX_ID)
    )
    expect(res.status).toBe(400)
  })

  it('accepts user_notes at exactly 500 characters', async () => {
    const updatedTx = {
      id: TEST_TX_ID,
      user_id: TEST_USER.id,
      category: 'Other',
      user_notes: 'x'.repeat(500),
    }
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: updatedTx, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(
      makePatchRequest(TEST_TX_ID, { user_notes: 'x'.repeat(500) }),
      mockParams(TEST_TX_ID)
    )
    expect(res.status).toBe(200)
  })

  it('updates transaction category for authenticated owner', async () => {
    const updatedTx = {
      id: TEST_TX_ID,
      user_id: TEST_USER.id,
      category: 'Housing',
      user_notes: null,
    }
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: updatedTx, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(
      makePatchRequest(TEST_TX_ID, { category: 'Housing' }),
      mockParams(TEST_TX_ID)
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.category).toBe('Housing')
  })

  it("cannot update another user's transaction (returns 404 or 500 — RLS blocks it)", async () => {
    // Supabase RLS would return no rows, causing .single() to error
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { code: 'PGRST116', message: 'No rows' } }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(
      makePatchRequest('other-users-tx', { category: 'Housing' }),
      mockParams('other-users-tx')
    )
    // Should not return 200 — either 404 or 500
    expect(res.status).not.toBe(200)
  })

  it('updates user_notes', async () => {
    const updatedTx = { id: TEST_TX_ID, user_id: TEST_USER.id, category: 'Other', user_notes: 'My note' }
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: updatedTx, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(
      makePatchRequest(TEST_TX_ID, { user_notes: 'My note' }),
      mockParams(TEST_TX_ID)
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user_notes).toBe('My note')
  })

  it('returns 400 for invalid JSON body', async () => {
    const { client } = createMockSupabase(TEST_USER)
    vi.mocked(createClient).mockResolvedValue(client as never)

    const req = new NextRequest(`http://localhost/api/transactions/${TEST_TX_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-valid-json',
    })
    const res = await PATCH(req, mockParams(TEST_TX_ID))
    expect(res.status).toBe(400)
  })

  it('can update is_income flag', async () => {
    const updatedTx = { id: TEST_TX_ID, user_id: TEST_USER.id, category: 'Income', is_income: true }
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: updatedTx, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(
      makePatchRequest(TEST_TX_ID, { is_income: true }),
      mockParams(TEST_TX_ID)
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.is_income).toBe(true)
  })

  it('can update is_transfer flag', async () => {
    const updatedTx = { id: TEST_TX_ID, user_id: TEST_USER.id, is_transfer: true }
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: updatedTx, error: null }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(
      makePatchRequest(TEST_TX_ID, { is_transfer: true }),
      mockParams(TEST_TX_ID)
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.is_transfer).toBe(true)
  })

  it('returns 500 when database update fails', async () => {
    const { client, mockFrom } = createMockSupabase(TEST_USER)
    mockFrom.mockReturnValue(makeBuilder({ data: null, error: { message: 'update failed' } }))
    vi.mocked(createClient).mockResolvedValue(client as never)

    const res = await PATCH(
      makePatchRequest(TEST_TX_ID, { category: 'Housing' }),
      mockParams(TEST_TX_ID)
    )
    expect(res.status).toBe(500)
  })
})
